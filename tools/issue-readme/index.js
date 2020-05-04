const fs = require('fs')
const { requestPromise } = require('../request-promise')
const issueUrl = 'https://api.github.com/repos/luoxue-victor/learn-node/issues'
const issuesSortByLabel = {}
const path = require('path')
const configPath = path.join(__dirname, 'config.json')

const time = Date.now()

const readConfig = JSON.parse(fs.readFileSync(configPath).toString())

const writeConfig = (ctx) => {
  fs.writeFileSync(configPath, JSON.stringify({ time, ctx }))
}

let isOverOneDay = false

if (time - readConfig.time > 1000 * 60 * 60 * 24) isOverOneDay = true

;(async () => {
  let page = 0
  let ctx = ''
  const allIssues = []

  // eslint-disable-next-line no-unmodified-loop-condition
  while (isOverOneDay) {
    page++
    try {
      const issueBody = await requestPromise(issueUrl, { page, state: 'all' })
      console.log(issueBody.length)
      if (!issueBody.length) break
      allIssues.push(...issueBody)
    } catch (error) {
      isOverOneDay = false
      return console.error(error)
    }
  }

  allIssues.reverse().forEach(issue => {
    issue.labels.forEach(label => {
      const labelNmae = label.name
      const hasLabel = !!issuesSortByLabel[labelNmae]
      if (hasLabel) {
        issuesSortByLabel[labelNmae].push(issue)
      } else {
        issuesSortByLabel[labelNmae] = [issue]
      }
    })
  })

  Object.keys(issuesSortByLabel).forEach(name => {
    ctx += `\n## ${name} \n\n`
    issuesSortByLabel[name].forEach(issue => {
      ctx += `- [${issue.title}](${issue.html_url}) \n`
    })
  })
  const readme = fs.readFileSync('./README.md').toString()

  isOverOneDay && ctx && writeConfig(ctx)

  fs.writeFileSync('./README.md', readme + (ctx || readConfig.ctx))
})()
