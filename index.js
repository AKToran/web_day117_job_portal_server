require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

//making middleware:
const logger = (req, res, next)=>{
  // console.log('inside the logger middleware,');
  next(); //without this it doesn't go to next step
}

// const verifyToken = (req, res, next) =>{
//   const token = req?.cookies?.token;
//   // console.log('cookie in the verify middleware:', token);
  
//   if(!token){
//     return res.status(401).send({ message: "unauthorized access, token not provided"})
//   }

//   jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded)=>{
//     if(err){
//       return res.status(401).send({message: "unauthorized access!"});
//     }
//     //set the decoded value to the req object to check decoded user from token and api user.
//     req.decoded = decoded;
//     // console.log(decoded);
//     next();
//   })
// }

const verifyToken = (req, res, next) =>{
  const token = req?.cookies?.token;
  
  if(!token){
    return res.status(401).send({ message: "unauthorized access, token not provided"})
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({message: "unauthorized access!"});
    }
    req.decoded = decoded;
    next();
  })
}

//verify firebase token
const verifyFirebaseToken = (req, res, next) =>{
  const header = req.headers?.authorization;
  const token = header.split(' ')[1];
  // console.log('firebase token', token);

  if(!token){
    return res.status(401).send({ message: "unauthorized access, token not provided"})
  }
  


  next();
}


const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_password}@cluster0.cjjjauk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const db = client.db("jobportal");
    const jobsCollection = db.collection("jobs");
    const applicationCollection = db.collection("applications");

    //jwt apis:
    app.post('/jwt', async(req, res)=>{
      const { email } = req.body;
      const user = { email }
      const token = jwt.sign(user, process.env.JWT_ACCESS_SECRET, {expiresIn: '1h'});

      //set the cookies:
      res.cookie('token', token, {
        httpOnly: true,
        secure: false
      })

      res.send({ success: true });
    })


    //job api
    app.get('/jobs', async(req, res)=>{
      const email = req.query.email;
      const query = {};
      if(email){
        query.hr_email = email;
      }
      const jobs = await jobsCollection.find(query).toArray();
      res.send(jobs);
    })

    app.get('/jobs/:id', async(req, res)=>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id) };
      const job = await jobsCollection.findOne(query);
      res.send(job);
    })

    app.post('/jobs', async(req, res)=>{
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    })

    //job application related apis
    //!application with email query for workers to see their applications
    app.get('/applications', logger, verifyToken, verifyFirebaseToken, async(req, res)=>{
      // console.log("cookie inside api:", req.cookies);
      const email = req.query.email;

      if(email !== req.decoded.email){
        return res.status(403).send({message: "Forbidden access!"})
      }

      const query = { applicant : email };
      const result = await applicationCollection.find(query).toArray();
      res.send(result); 
    })
    
    //get all the application on a job for recruiter:
    app.get('/applications/job/:job_id', async(req, res)=>{
      const job_id = req.params.job_id;
      const query = { jobId : job_id};
      console.log(job_id);
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/applications', async(req, res)=>{
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
      res.send(result);
    })

    app.patch('/applications/:id', async(req, res) =>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: req.body.status
        }
      }
      const result = await applicationCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
  res.send('job portal loading...');
})

app.listen(port, ()=>{
  console.log("running on port:", port);
})