const express = require('express');
const app = express();
const cors = require('cors');
var bodyParser = require('body-parser');

require('dotenv').config();
mongodb = require('mongodb');
mongoose = require('mongoose');

// DB Configuration
mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: true});

// Basic Configuration
app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});

const ExerciseSchema = new mongoose.Schema({
  description : {type: String, required: true},
  duration : {type: Number, required: true},
  date: String,
});

const UserSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [ExerciseSchema],  
});

const Exercise = mongoose.model('Exercise', ExerciseSchema);
const User = mongoose.model('User', UserSchema);

app.post('/api/users', bodyParser.urlencoded({ extended: false }), (req,res) => {
  let newUser = new User({username: req.body.username});
  newUser.save( (error,savedUser) => {
    if(!error){
      res.json({
        'username' : savedUser.username,
        '_id' : savedUser.id,
      });
    }
  });
});

app.get('/api/users', (req, res) => {

  User.find({}, (error, users) => {
    if(!error){
      res.json(users)
    }
  })
});

app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), (req,res) => {
  //Create Log
  let newExercise = new Exercise({
    description : req.body.description,
    duration : parseInt(req.body.duration),
    date: req.body.date ? req.body.date : new Date().toISOString().slice(0,10),
  });

  //Update User Exercise Log
  User.findOneAndUpdate(
    { '_id' : req.params._id},
    {$push : {log: newExercise}},
    {new: true},
    (error, updatedUser) => {
      if(!error){
        res.json({
          '_id' : updatedUser.id,
          'username' : updatedUser.username,
          'date' : new Date(newExercise.date).toDateString(),
          'description' : newExercise.description,
          'duration' : newExercise.duration
        });
      }
    }
  );
});

app.get('/api/users/:_id/logs', (req,res) => {
  // Find User
  User.findById(req.params._id, (error, user) => {
    
    if(!error){
    //Change Date Format
    
    if(req.query.from || req.query.to){
      let fromDate = new Date(0);
      let toDate = new Date();

      if(req.query.from){
        fromDate = new Date(req.query.from);
      }

      if(req.query.to){
        toDate = new Date(req.query.to);
      }

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      user.log = user.log.filter((log) => {
        let logDate = new Date(log.date).getTime();

        return logDate >= fromDate && logDate <= toDate
      });
    }

    if(req.query.limit){
      user.log = user.log.slice(0, req.query.limit);
    }
    
    user.log.forEach(log => {
      log.date = new Date(log.date).toDateString();
      log.duration = parseInt(log.duration);
      }
    );

    res.json({
      '_id' : user.id,
      'username' : user.username,
      'log' : user.log,
      'count': user.log.length
    });
    }
  })
});

