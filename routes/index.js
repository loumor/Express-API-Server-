const express = require('express'); 
const jwt = require('jsonwebtoken');

const router = express.Router();

router.get("/stocks/symbols", function(req,res, next) { 
  let queryInustry = req.query.industry; // Can't inject req.query directly into req.db line, must do this conversion 

  if (Object.keys(req.query).length === 0){
    req.db.from('stocks').select("name", "symbol", "industry").where("timestamp", "=", "2020-03-24")
    .then((rows) => {
      res.json(rows)
    })
    .catch((err) => {
      console.log(err);
    })
  } else if (typeof queryInustry === 'undefined') {
    res.status(400).json( {message: "Invalid query parameter: only 'industry' is permitted"} )

  } else {
    req.db.from('stocks').select("name", "symbol", "industry").where("industry", "LIKE", "%" + queryInustry + "%").where("timestamp", "=", "2020-03-24")
    .then((rows) => {
      if (rows.length === 0){
        res.status(404).json( {error: true, message: "Industry sector not found"} )
      } else {
        res.status(200).json(rows)
      }
    })
    .catch((err) => {
      console.log(err);
    })
  }
});

router.get("/stocks/:symbol", function(req,res, next) { 
  if (req.query.from){
    res.status(400).json( {error: true, message: "Date parameters only available on authenticated route /stocks/authed"} )
  } else {
    req.db.from('stocks').select("timestamp", "symbol", "name", "industry", "open", "high", "low", "close", "volumes").where("symbol", req.params.symbol).where("timestamp", "=", "2020-03-24")
    .then((rows) => {
      if (rows.length === 0){
        res.status(404).json( {error: true, message: "No entry for symbol in stocks database"} )
      } else {
        res.status(200).json(rows[0])
      }
    })
    .catch((err) => {
      console.log(err);
    })
  }
});

const authorize = (req, res, next) => {
  const authorization = req.headers.authorization
  let token = null;

  if (authorization && authorization.split(" ").length === 2){
    token = authorization.split(" ")[1]
  } else {
    res.status(403).json( {error: true, message: "Authorization header not found"} )
    return 
  }

  try {
    const decoded = jwt.verify(token,  process.env.SECRET_KEY)
    
    if (decoded.exp > Date.now()){
      res.status(403).json( {error: true, message: "Authorization header not found"} )
      return 
    }

    next()
  } catch (err) {
    res.status(403).json( {error: true, message: "Authorization header not found"} )
    return 
  }
}

router.get("/stocks/authed/:symbol", authorize, function(req,res, next) { 
  let fromQuery = req.query.from;
  let toQuery = req.query.to;

  if ( (typeof fromQuery === 'undefined') || (typeof toQuery === 'undefined') ){
    res.status(400).json({error: true, message: "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"})
  } else {
    req.db.from('stocks').select("timestamp", "symbol", "name", "industry", "open", "high", "low", "close", "volumes").where("symbol", req.params.symbol).whereBetween("timestamp", [fromQuery, toQuery])
    .then((rows) => {
      if (rows.length === 0){
        res.status(404).json( {error: true, message: "No entries available for query symbol for supplied date range"} )
      } else {
        res.status(200).json(rows)
      }
    })
    .catch((err) => {
      console.log(err);
    })
  }
});

module.exports = router;
