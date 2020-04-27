const fs = require('fs')
const { requestPromise } = require('../request-promise')
const issueUrl = 'https://api.github.com/repos/luoxue-victor/learn-node/issues'
const issuesSortByLabel = {}

console.log('create issue');

(async () => {
  let page = 0
  let ctx = ''
  const allIssues = []
  while (true) {
    page++
    try {
      const issueBody = await requestPromise(issueUrl, { page, state: 'all' })
      console.log(issueBody.length)
      if (!issueBody.length) break
      allIssues.push(...issueBody)
    } catch (error) {
      return
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
  fs.writeFileSync('./README.md', readme + ctx)
})()
