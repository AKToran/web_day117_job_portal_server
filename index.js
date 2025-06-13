require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

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

    app.get('/jobs', async(req, res)=>{
      const jobs = await jobsCollection.find().toArray();
      res.send(jobs);
    })

    app.get('/jobs/:id', async(req, res)=>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id) };
      const job = await jobsCollection.findOne(query);
      res.send(job);
    })

    //job application related apis
    app.get('/applications', async(req, res)=>{
      const email = req.query.email;
      const query = { applicant : email };
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    })
    
    app.post('/applications', async(req, res)=>{
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
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