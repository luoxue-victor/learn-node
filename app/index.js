require('@babel/register')({
  extensions: ['.es6', '.es', '.jsx', '.js', '.mjs', '.ts'],
  cache: true
})
const a = 0

console.error(a?.b)