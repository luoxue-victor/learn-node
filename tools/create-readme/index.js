const fs = require('fs')
const path = require('path')
const readmePath = path.join('tools', 'create-readme')

console.log('--- 创建readme ---')

const docsCtx = extraTxt('docs', (firstRow) => {
  return `[${firstRow.replace('## ', '')}]`
})

function joinCtx () {
  let str = ''
  str += readMdBy('header')
  str += detailTag('所有课题', docsCtx, true)
  str += readMdBy('useAndIntsall')
  str += '\n' +
    fs.readFileSync(path.join(__dirname, 'contributors.md')).toString()
  return str
}

const ctx = joinCtx()

fs.writeFileSync('README.md', ctx, 'utf-8')

function detailTag (title, ctx, isOpen = true) {
  return `
## ${title}
<details ${isOpen ? 'open=“open”' : ''}>
  <summary>点击关闭/打开${title}</summary> 
  <br/>
\n\n${ctx}
</details> \n\n`
}

function extraTxt (dirname, firstRowStrategy) {
  const files = fs.readdirSync(dirname)
  let ctx = ''
  files.forEach(file => {
    const absolutePath = path.join(process.cwd(), dirname, file)
    if (fs.statSync(absolutePath).isDirectory()) return
    const content = fs.readFileSync(absolutePath).toString()
    const firstRow = content.split('\n')[0].trim()
    const title = firstRowStrategy(firstRow)
    ctx += `- ${title}(./${dirname}/${file})\n`
  })
  return ctx
}

function readMdBy (name) {
  return fs.readFileSync(path.join(readmePath, name + '.md')).toString()
}