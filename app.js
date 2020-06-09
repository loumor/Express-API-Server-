const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

require("dotenv").config();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const swaggerUI = require('swagger-ui-express');
const yaml = require('yamljs');
const swaggerDocument = yaml.load('./docs/swagger.yaml');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
const https = require('https');

const privateKey = fs.readFileSync('./sslcert/cert.key','utf8'); 
const certificate = fs.readFileSync('./sslcert/cert.pem','utf8'); 
const credentials = {
  key: privateKey,
  cert: certificate
};

var app = express();

app.use(logger('common')); 
app.use(helmet());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));

logger.token('req', (req, res) => JSON.stringify(req.headers)) 
logger.token('res', (req, res) => {
  const headers = {}
  res.getHeaderNames().map(h => headers[h] = res.getHeader(h)) 
  return JSON.stringify(headers)
})

app.use(express.json());
app.use(express.urlencoded( { extended: false } ));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const options = require('./database_files/knexfile.js'); 
const knex = require('knex')(options);
app.use((req, res, next) => { 
  req.db = knex
  next()
})

app.get('/knex', function(req,res,next) { 
  req.db.raw("SELECT VERSION()").then(
    (version) => console.log((version[0][0]))
  ).catch((err) => { console.log(err); throw err }) 
  res.send("Version Logged successfully");
});

app.use(logger('common'));
app.use(helmet());
app.use(cors());

app.use('/', indexRouter);
app.use('/user', usersRouter);
app.use('/', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const server = https.createServer(credentials,app); 
server.listen(443);

module.exports = app;
