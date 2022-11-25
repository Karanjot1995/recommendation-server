require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors")
const User = require("./model/user");
const auth = require("./middleware/auth");
const app = express();
const TOKEN_KEY = '4556hghgjjjfftdfgcjvjkhfgchgfvjh'
var csv = require("csvtojson");
app.use(express.json({ limit: "50mb" }));
app.use(cors())


app.post("/api/sign-up", async (req, res) => {
  try {
    // Get user input
    const { name, email, password } = req.body;

    // Validate user input
    if (!(email && password && name)) {
      res.status(400).send("All input is required");
    }

    const oldUser = await User.findOne({ email });
    if (oldUser) {
      return res.status(409).send({msg:"User Already Exist. Please Login"});
    }

    //Encrypt user password
    encryptedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const user = await User.create({
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      name,
      liked: [],
      genres: {},
      password: encryptedPassword,
    });

    // Create token
    const token = jwt.sign(
      { user_id: user._id, email },
      // process.env.TOKEN_KEY,
      TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );
    // save user token
    user.token = token;
    // return new user
    res.status(201).json(user);
  } catch (err) {
    console.log(err);
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!(email && password)) {
      res.send({"status":400, msg:"All input is required"});
    }
    // Validate if user exist in our database
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        // process.env.TOKEN_KEY,
        TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );
      // save user token
      user.token = token;
      // user
      res.send({'access_token':token, 'user':user});
    }
  } catch (err) {
    console.log(err);
  }
});

let books = csv()
.fromFile('./dataset/Books.csv')
.then(function(books){
   return books
})

app.get('/api/books', async(req, res) => {
  res.send(await books)
})

app.get('/api/recommendations',auth, async(req, res) => {
  let curr_user = req.user
  books = await books
  let genre_books = {}
  if(curr_user){
    let user = await User.findOne({'email' : curr_user.email})
    const sortable = Object.entries(user.genres)
    .sort(([,a],[,b]) => b-a)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
    Object.keys(sortable).map(genre=>{
      genre_books[genre] = books.filter(b=> 
        JSON.parse(b.genres).indexOf(genre)>-1
      )
      genre_books[genre] = genre_books[genre].slice(0,10)
    })
    Object.keys(genre_books).map(g=>console.log(g,genre_books[g].length))
  }
  // let genre_books = 
  res.send({genre_books})
})
app.get('/api/liked-books', async (req,res)=>{

  let curr_user = req.user
  let books = await books;
  let user = await User.findOne({'email' : curr_user.email})
  let liked = []
  if(user){
    books.map(b=>{
      if(user['liked'].indexOf(b['id'])>-1){
        liked.push(b)
      }
    })
  }
  res.send(liked)
})

app.post('/api/like', auth, async (req,res)=>{
  const {id, liked} = req.body

  const user = await User.findOne({ email:req.user.email });
  if(user){
    if(liked && !user['liked']){
      user.liked = [id]
    }else if(liked && user['liked'].indexOf(id)==-1){
      user.liked.push(id)
    }else if(!liked && user['liked'].indexOf(id)>-1){
      ids = user.liked.filter((book_id) => book_id != id)
      user.liked = ids
    }
      
    let liked_ids = user['liked']
    let all_books = await books
    liked_books = []
    if (liked_ids){
      liked_books = all_books.filter(book=>liked_ids.indexOf(book['id'])>-1)
    }
      

    let genres = {}
    liked_books.map(book=>{
      JSON.parse(book['genres']).map(genre=>{
        genres[genre]?genres[genre]+=1:genres[genre] = 1
      })
    })
    user.genres = genres;
    await user.save()
  }
  // delete user['_id'], user['password']
  res.send({user})

})

app.get("/", (req, res) => {
  res.send("Hello 🙌 ");
});

app.get("/welcome", auth, (req, res) => {
  res.status(200).send("Welcome 🙌 ");
});

// This should be the last route else any after it won't work
app.use("*", (req, res) => {
  res.status(404).json({
    success: "false",
    message: "Page not found",
    error: {
      statusCode: 404,
      message: "You reached a route that is not defined on this server",
    },
  });
});

module.exports = app;
