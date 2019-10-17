'use strict'

const ctrlTelegram = require('./telegramMsg');

const crypto = require('crypto')
const { resolve } = require('path')
const { readFileSync } = require('fs')

require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const nodemailer = require('nodemailer')

const { GMAIL_USER, GMAIL_PASS } = process.env
console.log({ gmail_user: GMAIL_USER, gmail_pass: GMAIL_PASS })
const DEV = process.env.NODE_ENV === 'development'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  },
})

const PORT = process.env.PORT ||
  (process.env.NODE_ENV === 'development' ? 8080 : 80)

const url = DEV
  ? 'http://localhost:8080'
  : 'https://stark-springs-03070.herokuapp.com'
  
  
const users = {}

const createToken = (length = 16) => crypto.randomBytes(length).toString('hex')

const createUser = password => ({
  password,
  confirmationToken: createToken(),
  loginTokens: [],
  recoverToken: undefined
})

// const users = new Map([[ 'kefirchik3@gmail.com', '123123' ]])
// const tokens = new Set()

const app = express()
// const emailTemplate = readFileSync(
//   resolve(__dirname, 'email-template.html'),
//   'utf8'
// )

// app.use((_req, _res, next) => {
//   console.log('Users', users)
//   return next()
// })

app.use(cookieParser())
app.use(bodyParser.json())

app.get('/', (req, res) => {
  const { token } = req.cookies
  const tokens = Object.values(users).reduce(
    (result, user) => result.concat(user.loginTokens),
    []
  )
  if (!tokens.includes(token)) {
    res.sendFile(resolve('public/index.html'))
  } else {
    res.sendFile(resolve('public/index-logged.html'))
  }
})

app.get('/index-logged*', (req, res) => {
  res
    .status(301)
    .set('location', '/').end()
})

app.use(express.static(__dirname + '/../public/'))
app.listen(PORT, () => console.log(`Listening on :${PORT}`))

app.post('/register', (req, res) => {
  const { email, password } = req.body
  if (Object.keys(users).includes(email)) {
    console.error('User exists...')
    res.status(500).end()
    return
  }
  console.log(`User ${email} added to registry...`)
  users[email] = createUser(password)
  const html = `
    <div>
      <a href="${url}/confirm?token=${users[email].confirmationToken}">Підтвердити реєстрацію</a>
    </div>
  `

  transporter.sendMail(
    {
      from: GMAIL_USER,
      to: email,
      subject: 'Ви зареєструвались :)',
      html
    },
    (err, info) => {
      if (err) {
        console.error(err, 'E-Mail sending failed')
        return
      }
      console.log('E-Mail sent successfully')
    }
  )

  res.status(200).end()
})

app.post('/login', (req, res) => {
  const { email, password } = req.body
  const existingUser = users[email]
  console.log(existingUser)
  if (!existingUser) {
    res.status(404).set('content-type', 'text/plain').end('Такого користувача немає')
    return
  }
  if (existingUser.password !== password) {
    res.status(401).set('content-type', 'text/plain').end('Неправильний пароль')
    return
  }
  if (existingUser.confirmationToken) {
    res.status(401).set('content-type', 'text/plain').end('Поштова скринька не підтверджена')
    return
  }
  const token = createToken()
  existingUser.loginTokens.push(token)
  res.set({
    'set-cookie': `token=${token}`
  })
  console.log(`User logged in with token ${token}`)
  res.status(200).end()
})

app.get('/confirm', (req, res) => {
  const { token } = req.query
  const email = Object.keys(users).find(
    email => users[email].confirmationToken === token
  )
  if (email) {
    console.log(`User ${email} confirmed`)
    users[email].confirmationToken = undefined
    res.status(200).end('Email confirmed')
  } else {
    res.status(401).end('Wrong confirmation token')
  }
})

app.post('/telegram', ctrlTelegram.sendMsg);

app.post('/recover', (req, res) => {
  const { email } = req.body
  if (!users[email]) {
    res.status(400).set('content-type', 'text/plain').end('Такого користувача немає')
    return
  }
  users[email].recoverToken = createToken()
  
  const html = `
    <div>
      <a href="${url}/recover?token=${users[email].recoverToken}">
        Підтвердити реєстрацію
      </a>
    </div>
  `
  
  transporter.sendMail(
    {
      from: GMAIL_USER,
      to: email,
      subject: 'Відновлення пароля',
      html
    },
    (err, info) => {
      if (err) {
        console.error(err, 'E-Mail sending failed')
        res.status(500).end('Faild to send email')
        return
      }
      console.log('E-Mail sent successfully')
      res.status(200).end()
    }
  )
})

app.get('/recover', (req, res) => {
  const { token } = req.query
  const email = Object.keys(users).find(
    email => users[email].recoverToken === token
  )
  if (email) {
    console.log(`User ${email} started recovering`)
    res.status(200).sendFile(resolve('public/recover.html'))
  } else {
    res.status(401).end('Wrong recover token')
  }
})

app.post('/newpass', (req, res) => {
  const { token, newpass } = req.body
  const email = Object.keys(users).find(
    email => users[email].recoverToken === token
  )
  
  if (email) {
    users[email].password = newpass
    users[email].recoverToken = undefined
    res.status(200).end('Password recovered')
  } else {
    res.status(401).end('User doesn\'t exist')
  }
})
