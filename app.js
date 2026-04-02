const express = require("express")
const mongoose = require("mongoose")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const bcrypt = require("bcryptjs")
const multer = require("multer")

const app = express()

// Middleware
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))

// View engine
app.set("view engine", "ejs")

// MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/devops_project")

// Models
const User = mongoose.model("User", {
 name: String,
 email: String,
 password: String
})

const Paper = mongoose.model("Paper", {
 title: String,
 filename: String,
 createdAt: { type: Date, default: Date.now }
})

// Session
app.use(session({
 secret: "secret",
 resave: false,
 saveUninitialized: false
}))

// Multer (file upload)
const storage = multer.diskStorage({
 destination: "public/uploads",
 filename: (req, file, cb) => {
  cb(null, Date.now() + "-" + file.originalname)
 }
})
const upload = multer({ storage })

// Auth middleware
function isAuth(req, res, next) {
 if (req.session.user) return next()
 res.redirect("/login")
}

// Routes

app.get("/", (req, res) => res.redirect("/login"))

// Register
app.get("/register", (req, res) => res.render("register"))

app.post("/register", async (req, res) => {
 const hash = await bcrypt.hash(req.body.password, 10)
 await User.create({
  name: req.body.name,
  email: req.body.email,
  password: hash
 })
 res.redirect("/login")
})

// Login
app.get("/login", (req, res) => res.render("login"))

app.post("/login", async (req, res) => {
 const user = await User.findOne({ email: req.body.email })
 if (!user) return res.send("User not found")

 const match = await bcrypt.compare(req.body.password, user.password)
 if (!match) return res.send("Wrong password")

 req.session.user = user
 res.redirect("/dashboard")
})

// Logout
app.get("/logout", (req, res) => {
 req.session.destroy()
 res.redirect("/login")
})

// Dashboard
app.get("/dashboard", isAuth, (req, res) => {
 res.render("dashboard", { user: req.session.user })
})

// Live dashboard data
app.get("/dashboard-data", async (req, res) => {
 const totalUsers = await User.countDocuments()
 const totalPapers = await Paper.countDocuments()

 res.json({ totalUsers, totalPapers })
})

// Upload page
app.get("/upload", isAuth, (req, res) => {
 res.render("upload")
})

// Upload paper
app.post("/upload", isAuth, upload.single("pdf"), async (req, res) => {
 await Paper.create({
  title: req.body.title,
  filename: req.file.filename
 })
 res.redirect("/papers")
})

// List papers
app.get("/papers", isAuth, async (req, res) => {
 const papers = await Paper.find()
 res.render("papers", { papers })
})

// View single paper
app.get("/paper/:id", isAuth, async (req, res) => {
 const paper = await Paper.findById(req.params.id)
 res.render("paper", { paper })
})

// Start server
app.listen(5000, () => console.log("Server running on port 5000"))