import express from 'express'
const app = express()

app.get('*', (req, res) => {
  console.log('Request', req.method, req.url, req.protocol, req.hostname)
  res.send('Hello World!')
})

app.listen(3000)
