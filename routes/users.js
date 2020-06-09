const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post("/register", function(req, res, next){

  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password){
    res.status(400).json({
      error: true, 
      message: "Request body incomplete - email and password needed"
    })
    return
  }

  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers
    .then((users) => {
      if(users.length > 0){
        res.status(409).json( {error: true, message: "User already exists"} )
        return;
      }
      const saltRounds = 10
      const hash = bcrypt.hashSync(password, saltRounds)
      return req.db.from("users").insert({email, hash})
    }) 
    .then(() => {
      res.status(201).json( {error: true, message: "User created"} )
    })

})

router.post("/login", function(req, res, next){

  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password){
    res.status(400).json({
      error: true, 
      message: "Request body invalid - email and password are required"
    })
    return
  }

  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers
    .then((users) => {
      if(users.length === 0){
        res.status(401).json( {error: true, message: "Incorrect email or password"} )
        return;
      }
      const user = users[0]
      return bcrypt.compare(password, user.hash)
    }) 
    .then((match) => {
      if (!match) {
        res.status(401).json( {error: true, message: "Incorrect Password"} )
        return 
      }
      const expires_in = 60 * 60 * 24 // 1 day
      const exp = Math.floor(Date.now() / 1000) + expires_in
      const token = jwt.sign({email, exp}, process.env.SECRET_KEY)
      res.status(200).json( {token, token_type: "Bearer", expires_in} )
    })

})

module.exports = router;
