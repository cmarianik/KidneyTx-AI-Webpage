const express = require('express');
const session = require('express-session');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const app = express();
const cors = require('cors');
const { dblClick } = require('@testing-library/user-event/dist/click');
const { connectToDb, getDb} = require('./db');
const { json } = require('react-router-dom');
const { ObjectId } = require('mongodb');
const { escape } = require('querystring');

/** This file is the server backend, handling communications between the frontend and the pipeline.
 *  
 */






// Database setup
let db
connectToDb((err) => {
  if(!err){
    const PORT = 3001;
    app.listen(PORT, () => {
      console.log(`Mock server is running on port ${PORT}`);
    });
    db = getDb()
  }
})

app.use(cors());
// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Set up multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const entries = JSON.parse(req.body['entry']);
    const user_id = entries.user_id;
    if (!user_id) {
      return cb('No user_id provided', null);
    }
  
    // Set the destination folder based on user_id
    const destinationFolder = `/mnt/UserData1/mariac06/pathology_image_UNOS/wsi_data/${user_id}`;
    // Check if the directory exists; if not, create it
    fs.mkdir(destinationFolder, { recursive: true }, (err) => {
      if (err) {
        return cb(err, null);
      }
      cb(null, destinationFolder);
    });
  },
  filename: (req, file, cb) => {
    const entries = JSON.parse(req.body['entry']);
    const image = entries.file_id;
    console.log(image);
    cb(null, image);
  },
});
const upload = multer({ storage });

app.use(session({
  secret: '<redacted>',
  resave: false,
  saveUninitialized: true
}));


// Handle array of JSON objects and images
app.post('/data-array', upload.fields([
  { name: 'entry', maxCount: 10 },
  { name: 'image', maxCount: 10 }
]), (req, res) => {
  const entries = JSON.parse(req.body['entry']);
  const images = req.files['image'];
  // You can save the paired data to disk or perform other actions here
  res.send('Data received successfully!');
});


/** This handler handles the process of starting the pipeline
 * It receives a list of image entries, and calls test_txt.py
 * test_txt.py converts these entries into a proper input text file 
 */
app.post('/test_script', async (req, res) => {
  const entries = req.body.entries;
  const jsonArgument = JSON.stringify(entries);
  try {
    const pythonScript = 'test_text.py';
    const { exec } = require('child_process');
    const child = exec(`python ${pythonScript} '${jsonArgument}'`);

    // Capture and display Python script's output
    child.stdout.on('data', (data) => {
      console.log(`Python Script Output: ${data}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`Python Script Error: ${data}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        res.json('Python function executed successfully');
      } else {
        res.status(500).send('Error executing Python script');
      }
    });
  } catch (error) {
    console.error('Error executing Python script:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Same as above but for clinical data
app.post('/script_clinical', async (req, res) => {
  const entries = req.body.entries;
  try {
    const pythonScript = 'clinical_text.py';
    const { exec } = require('child_process');
    const child = exec(`python ${pythonScript} '${JSON.stringify(entries)}'`);

    // Capture and display Python script's output
    child.stdout.on('data', (data) => {
      console.log(`Python Script Output: ${data}`);
    });
    child.stderr.on('data', (data) => {
      console.error(`Python Script Error: ${data}`);
    });
    child.on('close', (code) => {
      if (code === 0) {
        res.json('Python function executed successfully');
      } else {
        res.status(500).send('Error executing Python script');
      }
    });
  } catch (error) {
    console.error('Error executing Python script:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Retrieve all images/jobs of user from the database.
app.get('/kidney_get', async (req, res) => {
  const user_id = req.query.username;
  try {
    const user = await db.collection('user').findOne({ fb_id: user_id });
    if (!user) {
      return res.status(404).send('User not found');
    }
    const jobsWithFiles = await Promise.all(user.job_array.map(async job => {
      const files = await db.collection('image').find({
        _id: { $in: job.job_obj_ids.map(id => new ObjectId(id)) }
      }).toArray();

      return {
        job_id: job.job_id,
        file_ids: files.map(file => file.file)
      };
    }));
    res.status(200).json(jobsWithFiles);
  } catch (err) {
    console.error('Failed to retrieve job_array data:', err);
    res.status(500).send('Failed to retrieve data');
  }
});

// Checks database for incomplete jobs based on missing datapoints
app.get('/ongoing_check', async (req, res) => {
  const user_id = req.query.username;
  try{
    const user = await db.collection('user').findOne({fb_id: user_id });
    if(!user){
      return res.status(404).send('User not found');
    }

    // for each job object in the user's job_array
    for (const job of user.job_array){
      // destructure into the job_id and the objectIds array
      const {job_id, job_obj_ids} = job;
      for (const objectId of job_obj_ids) {
        const imageDoc = await db.collection('image').findOne({ _id: objectId });

        if (!imageDoc) {
          return res.status(404).send('Image document not found');
        }

        // if there exists an ongoing process, return its jobid
        if (!imageDoc.base_size) {
          console.log("ongoing job found. returning id");
          return res.status(200).json({ job_id });
        }
      }
    }
    res.status(200).json({message: "No ongoing images"});
  }catch(error){
    console.error("Error processing request: ", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// Retrieves finished result data from database for a given job based on an array of fileids
app.get('/db_info', async (req, res) => {
  try {
      // Retrieve file_ids from query parameters and parse it
      const fileIdsString = req.query.file_ids;
      if (!fileIdsString) {
        console.log("No file_ids provided.");
          return res.status(400).json({ error: "No file_ids provided." });
      }

      // Parse the JSON string into an array
      const fileIds = JSON.parse(fileIdsString);
      if (!Array.isArray(fileIds)) {
        console.log("Invalid input was received: "+fileIds);
          return res.status(400).json({ error: "Invalid input, expected an array of file_ids." });
      }
      const imageCollection = await db.collection('image');

      // Query based on file_id which are assumed to be strings
      const documents = await imageCollection.find({ file: { $in: fileIds } }).toArray();

      if (!documents.length) {
        console.log("Failed to find any appropriate image for: "+fileIds);
          return res.status(404).json({ message: "No documents found for the provided IDs." });
      }
      res.status(200).json(documents);
  } catch (error) {
      console.error('Failed to retrieve data:', error);
      res.status(500).json({ error: "An error occurred while retrieving data." });
  }
});

/** This handler initiates the database entries for a new job
 * It receives a list of image entries, and adds the initial data to a db entry.
 * Entry data is split into recipients, donors, images, and users.
 * These entries will be further filled out when the pipeline finishes
 */
app.post('/initkid', async (req, res) => {
  try {
    const db = getDb();
    const entries = req.body.entry;

    let results = [];
    let firstJob = null;
    // Ensure to use 'entries()' to get both index and entry in the loop
    for (const [index, entry] of entries.entries()) {
      const { file_id, kdpi, induction, age, pump, cit, user_id, job_id } = entry;

      // Database collections setup
      const recipients = db.collection('recipient');
      const donors = db.collection('donor');
      const images = db.collection('image');
      const users = db.collection('user');

      // Correctly splitting the file_id to separate the filename and extension
      const lastDotIndex = file_id.lastIndexOf('.');
      const fileName = file_id.substring(0, lastDotIndex);
      const fileFormat = file_id.substring(lastDotIndex + 1);

      let updateResult;
      try {
        const recipientResult = await recipients.insertOne({ recipient_age: age, induction_type: induction });
        const recipientId = recipientResult.insertedId;

        const donorResult = await donors.insertOne({ cold_ischemia: cit, pump: pump, kdpi: kdpi, recipient: recipientId });
        const donorId = donorResult.insertedId;

        await recipients.updateOne({ _id: recipientId }, { $set: { donor: donorId } });

        const imageResult = await images.insertOne({
          file: fileName,
          format: fileFormat,
          kdpi: kdpi,
          recipient: recipientId,
          donor: donorId
        });
        const imageId = imageResult.insertedId;

        if (index === 0) {
          updateResult = await users.updateOne(
            { fb_id: user_id },
            { $push: { job_array: { job_id: job_id, job_obj_ids: [imageId] } } },
            { upsert: true }
          );
          firstJob = job_id;
        } else {
          updateResult = await users.updateOne(
            { fb_id: user_id, "job_array.job_id": firstJob },
            { $push: { "job_array.$.job_obj_ids": imageId } }
          );
        }
        results.push({ entry: entry, status: 'success' });
      } catch (err) {
        console.error('Error processing entry:', entry, err);
        results.push({ entry: entry, status: 'failed', error: err.message });
      }
    }
    res.status(201).json({ message: 'Entries processed', results: results });
  } catch (err) {
    console.error('Error processing the request:', err);
    res.status(500).json({ err: 'Could not process the entries' });
  }
});


// Helper function to update images for a specified job.
async function updateImages(db, updatedb, userid, jobid) {
  const updateImage = async (imageId, updateParams) => {
      const updateResult = await db.collection('image').updateOne(
          { _id: imageId },
          { $set: updateParams }
      );
      return updateResult;
  };
  try {
      // Find the appropriate user by fb_id
      const user = await db.collection('user').findOne({ fb_id: userid });
      if (!user) {
          console.log(`No user found with fb_id ${userid}`);
          return;
      }

      // Search the user's job_array for the correct job by job_id
      const job = user.job_array.find(job => job.job_id === jobid);
      if (!job) {
          console.log(`No job found with job_id ${jobid} for user ${userid}`);
          return;
      }

      const jobObjIds = job.job_obj_ids;
      // Iterate through each updateEntry and update corresponding images
      for (const updateEntry of updatedb) {
          const file = updateEntry.file;

          for (const objId of jobObjIds) {
              const image = await db.collection('image').findOne({ _id: objId });
              if (!image) {
                  console.log(`No image found with ObjectId ${objId}`);
                  continue;
              }

              // Ensure the image's file matches the updateEntry's file
              if (image.file === file) {
                  console.log(`Updating image with ObjectId ${objId} and file ${file}`);

                  // Iterate over updateEntry properties and update the image accordingly
                  for (const [key, value] of Object.entries(updateEntry)) {
                      if (key !== 'file') {
                          if (image.hasOwnProperty(key)) {
                              if (image[key] !== value) {
                                  console.log(`Overwriting ${key} in image with new value ${value}`);
                              }
                          } else {
                              console.log(`Adding ${key} to image with value ${value}`);
                          }
                          image[key] = value;
                      }
                  }
                  await updateImage(image._id, image);
              }
          }
      }
  } catch (err) {
      console.error('Error updating images:', err);
  }
}

// Updates image data records on pipeline completion using above helper method.
app.patch('/updatekid', async (req, res) => {
  const db = getDb();
  const updatedb = req.body.updatedb;
  const userid = req.body.username;
  const jobid = req.body.jobid;
  console.log("Received update, username, and jobid: ", updatedb, userid, jobid);

  try {
      updateImages(db, updatedb, userid, jobid);
      res.status(200).send('Images updated successfully');
  } catch (error) {
      console.error('Error updating images:', error);
      res.status(500).json({ error: 'Error updating images' });
  }
});

// Cancels incomplete/ongoing jobs for provided jobid & userid.
/** This handler cancels incomplete/ongoing jobs
 * It receives a firebase/user id and a job id and removes associated database entries
 * It calls bashCancel.sh to remove ongoing processes associated with the userid.
 * It also runs fileCleanup.js to remove job-related input files and folders.
 */
app.patch('/cancel_ongoing', async (req, res) => {
  const db = getDb();
  // Receive ongoing jobid and userid for db removal and folder finding, respectively
  const userid = req.body.username;
  const jobid = req.body.jobname;

  try {
    const user = await db.collection('user').findOne({ fb_id: userid });
    if (!user) {
      return res.status(404).send('User not found');
    }
    const jobArray = user.job_array || [];
    const jobIndex = jobArray.findIndex(job => job.job_id === jobid);
    if (jobIndex === -1) {
      return res.status(404).send('Job not found');
    }
    const job = jobArray[jobIndex];

    job.job_obj_ids.forEach(objId => {
      console.log(objId);
    });

    for (let objId of job.job_obj_ids) {
      const image = await db.collection('image').findOne({ _id: objId });

      if (!image) {
        console.error(`Image not found for ObjectId ${objId}`);
        continue;
      }

      // Remove donor and recipient objects
      if (image.donor) {
        await db.collection('donor').deleteOne({ _id: image.donor });
      }
      if (image.recipient) {
        await db.collection('recipient').deleteOne({ _id: image.recipient });
      }

      // Remove image object itself
      await db.collection('image').deleteOne({ _id: objId });
    }

    // Remove job entry from job_array
    jobArray.splice(jobIndex, 1);

    // Update user document in the database to reflect changes
    await db.collection('user').updateOne(
      { fb_id: userid },
      { $set: { job_array: jobArray } }
    );

    // Run the bash script to cancel the job
    const bashScript = exec(`bash bashCancel.sh ${userid}`);
    bashScript.stdout.on('data', (data) => {
      console.log(`Bash script output: ${data}`);
    });
    bashScript.stderr.on('data', (data) => {
      console.error(`Error from bash script: ${data}`);
    });
    res.send('Job cancellation process completed (with database update)');
  } catch (error) {
    console.error('Error canceling ongoing job:', error);
    res.status(500).send('Internal Server Error');
  }

 //FILE CLEANUP related
  const command = `node fileCleanup ${userid}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr}`);
    }
    console.log(`Output: ${stdout}`);
  });
});

// Allows frontend to download the results zip file based on provided userid/jobid
// zip file contains image results and .csv output data
app.get('/results', (req, res) => {
  const user_id = req.query.username; // Use req.query to get 'username' from the URL query parameters
  const jobid = req.query.jobid;
  const filePath = `/mnt/UserData1/mariac06/pathology_image_UNOS/${user_id}/${jobid}/ensemble_wsi/${user_id}_results.zip`; // Updated file path

  console.log("downlading from "+filePath);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If the file does not exist, send a 404 (Not Found) response
      return res.status(404).json({ error: 'File not found' });
    }

    // If the file exists, send it as a response. Second arg is name of file when downloaded
    res.download(filePath, `${user_id}_results.zip`, (err) => {
      if (err) {
        // If there's an error while sending the file, send a 500 (Internal Server Error) response
        return res.status(500).json({ error: 'Error sending the file' });
      }
    });
  });
});

// Allows frontend to download html report containing results in a more digestible format.
app.get('/result_report', (req, res) => {
  const user_id = req.query.username;
  const jobid = req.query.jobid;
  const filePath = `/mnt/UserData1/mariac06/pathology_image_UNOS/${user_id}/${jobid}/${user_id}_${jobid}_report.html`;

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.download(filePath, `${user_id}_results.zip`, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error sending the report' });
      }
    })
  })
})

// Provides pipeline output .csv file to the caller. Called by results page and some backend scripts.
app.get('/csv', (req, res) => {
  const user_id = req.query.username;
  const filePath = `/mnt/UserData1/mariac06/pathology_image_UNOS/${user_id}_newpipeline/ensemble_wsi/ensembled_group_features_per_sample.csv`;
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(filePath, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error sending the file' });
      }
    });
  });
})

// Same as above but for the clinical .txt file.
app.get('/clinic_csv', (req, res) => {
  const user_id = req.query.username;
  const jobid = req.query.jobid;
  const filePath = `/mnt/UserData1/mariac06/pathology_image_UNOS/${user_id}_${jobid}_clinical.txt`;

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filePath, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error sending the file' });
      }
    });
  });
})

// Stores firebase userid and email as a basepair in a file for faster access
// TODO: encrypt file for security purposes. Currently secure but not scalable.
app.post('/email_storage', (req, res) => {
  console.log(req.body);
  const { user_id, email } = req.body;
  const filePath = '/mnt/UserData1/mariac06/pathology_image_UNOS/email_data';
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        const emailData = {};
        writeEmailData(emailData, filePath, user_id, email, res);
      } else {
        console.error(err);
        res.status(500).send('Error reading file');
      }
      return;
    }
    try {
      const emailData = JSON.parse(data);
      writeEmailData(emailData, filePath, user_id, email, res);
    } catch (parseError) {
      console.error(parseError);
      res.status(500).send('Error parsing JSON data');
    }
  });
});
// Helper function for above storage handler.
function writeEmailData(emailData, filePath, user_id, email, res) {
  if (!(user_id in emailData)) {
    emailData[user_id] = email;

    fs.writeFile(filePath, JSON.stringify(emailData), 'utf8', err => {
      if (err) {
        console.error(err);
        res.status(500).send('Error writing to file');
        return;
      }

      res.send('Email stored successfully');
    });
  } else {
    res.send('User ID already exists');
  }
}

// Receives images and stores them in a folder labeled with userid.
app.post('/upload', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'user_id' }]), (req, res) => {
  const imageFiles = req.files['image'];
  const user_id = req.body.user_id;

  if (!imageFiles || !imageFiles[0]) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  if(!user_id){
    return res.status(400).json({ error: 'No username provided'});
  }
  const imageFile = imageFiles[0];
  const imagePath = imageFile.path;
  res.json({ message: 'Image and user_id uploaded successfully', imagePath, user_id });
});

// Provides base64 images to the frontend from storage based on userid and jobid.
// These images are the compressed .jpeg versions of the pipeline output files.
app.get('/images', async (req, res) => {
  try {
    const user_id = req.query.userid;
    const folder_id = req.query.folderid;
    console.log(req.query);
    const uploadDir = `/mnt/UserData1/mariac06/pathology_image_UNOS/temp/${user_id}/${folder_id}`;
    const files = await readdir(uploadDir);

    const imageFiles = files.filter((file) => {
      const extname = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg'].includes(extname);
    });
    res.setHeader('Content-Type', 'application/json');

    const base64Images = [];
    for (const filename of imageFiles) {
      const filePath = path.join(uploadDir, filename);
      console.log("Processing file:", filename);
      const imageBuffer = await readFile(filePath);

      // Convert the image buffer to a base64-encoded string
      const base64Image = imageBuffer.toString('base64');
      base64Images.push(`data:image/jpeg;base64,${base64Image}`);
    }
    res.json(base64Images);
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});