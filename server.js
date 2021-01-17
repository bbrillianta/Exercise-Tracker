const express = require('express')
const app = express()
const cors = require('cors')
const { urlencoded } = require('body-parser')
const mongoose = require('mongoose');
require('dotenv').config()
mongoose.connect(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

//--Basic config--//

app.use(cors())
app.use(express.static('public'))
app.use(urlencoded({extended: false}));

//--END Basic config--//

//--MongoDB config--//

//Define mongoose Schema
const { Schema } = mongoose;

//New user schema
const userSchema = new Schema({
  username: String,
  count: { type: Number, default: 0 },
  log: {
    type: [{
      description: String,
      duration: Number,
      date: String
    }],
    default: []
  }
});

//User model
const User = mongoose.model('User', userSchema, 'users');

//--END MongoDB config--//

//--Routing--//

//Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Register
app.post('/api/exercise/new-user', (req, res, next) => {
  const { username } = req.body;

  const createUser = async () => {
    const newUser = await User({
      username: username,
    });

    const createdUser = await newUser.save();

    return createdUser;
  }

  createUser()
  .then(user => res.json({ username: username, _id: user._id }))
  .catch(next);
});

//List of Users
app.get('/api/exercise/users', (req, res, next) => {
  const getUsers = async () => await User.find(null, '_id username');

  getUsers()
  .then(users => res.send(users))
  .catch(next);
});

//Adding exercises
app.post('/api/exercise/add', (req, res, next) => {
  const { userId, description } = req.body;
  let { date, duration } = req.body;

  date = ((date == "") ? new Date().toDateString() : new Date(date).toDateString());
  duration = parseInt(duration);

  const addExercise = async () => { 
    return await User.findByIdAndUpdate(userId, {
      $inc: { count: 1 },
      $push: { log: {
        description: description,
        duration: duration,
        date: date
      } }
    }, {new: true}); 
  }

  addExercise()
  .then(user => res.send({
    _id: user._id,
    username: user.username,
    date: date,
    duration: duration,
    description: description
  }))
  .catch(next);
});

app.get('/api/exercise/log', (req, res, next) => {
  const { userId , limit, from, to } = req.query;
  let fromDate = new Date(0);
  let toDate = new Date();

  const getUser = async () => { 
    let query = await User.findById(userId);

    if(from != undefined) { 
      fromDate = await new Date(from).toDateString();
      fromDate = await new Date(fromDate).getTime();
    }

    if(to != undefined) { 
      toDate = await new Date(to).toDateString(); 
      toDate = await new Date(toDate).getTime();
    }

    if(from != undefined || to != undefined) {
      query.log = await query.log.filter(log => {
        const logDate = new Date(log.date).getTime();
          
        return logDate >= fromDate && logDate <= toDate;  
      });
    }
    
    if(limit != undefined) { 
      query.log.splice(limit); 
    }
    
    return query;
  }

  getUser()
  .then(user => res.send(user))
  .catch(e => res.sendStatus(404));
});

//--END Routing--//

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
