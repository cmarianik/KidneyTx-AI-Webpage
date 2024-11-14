const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/* This chokidar watcher program is to be running while the site is up. It handles the start/stop of the pipeline.
  * When it detects a "_newtest.txt" file creation, it spawns a "_newpipeline" directory
  *   This directory is the output directory for the pipeline. bashDocker.sh will be called to start the pipeline.
  * A subwatcher will be created in this "_newpipeline" directory to detect pipeline termination.
  *   Termination is marked by a .txt file being created in the "ensemble_wsi" folder.
  *   On termination, it runs the bashZip.sh script which handles cleanup.
  *   After the script finishes, it moves the "_newpipeline" directory into the "user" directory denoted by it's firebase id.
  */

// Define the directory to watch for file creation
const directoryToWatch = '/mnt/UserData1/mariac06/pathology_image_UNOS/';

// Initialize a watcher for the directory
const watcher = chokidar.watch(directoryToWatch, {
  ignored: /(^|[\/\\])\../, // Ignore hidden files
  persistent: true, //keep running all the time.
  ignoreInitial: true, // Ignore events for existing files when the watcher is first initialized.
});

// Watch for the creation of a "_newtest.txt" file, upon which you spawn the "_newpipeline" folder.
//  Then, call bashDocker.sh, which will run the machine learning pipeline.
watcher.on('add', (filePath) => {
  // Must make sure it is in the root directory because the pipeline duplicates the input text file.
  if (!filePath.includes('_newpipeline') && filePath.endsWith('_newtest.txt')) {
    const bashScript = './bashDocker.sh';

    // Extract userid and filetype from the filename for use in the bash script.
    const fileName = path.basename(filePath);
    const firstUnderscoreIndex = fileName.indexOf('_');
    const lastUnderscoreIndex = fileName.lastIndexOf('_');
    const secondToLastUnderscoreIndex = fileName.lastIndexOf('_', lastUnderscoreIndex - 1);
    const thirdToLastUnderscoreIndex = fileName.lastIndexOf('_', secondToLastUnderscoreIndex - 1);

    // Extract user ID and the file type. fileID == jobID
    const userId = fileName.slice(0, firstUnderscoreIndex);
    const fileID = fileName.slice(firstUnderscoreIndex + 1, thirdToLastUnderscoreIndex);
    const skipyn = fileName.slice(secondToLastUnderscoreIndex + 1, lastUnderscoreIndex);
    const fileType = fileName.slice(thirdToLastUnderscoreIndex +1, secondToLastUnderscoreIndex);

    // execute bashDocker.sh with the established arguments.
    exec(`bash ${bashScript} ${userId} ${fileID} ${fileType} ${skipyn}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Bash script: ${error}`);
        return;
      }
      // Check the exit code of the 'docker exec' command
      if (stderr) {
        console.error(`Docker Script Error: ${stderr}`);
      } else {
        console.log(`Bash Script Output: ${stdout}`);
      }
    });
  }
});

// Watches for the creation of folders ending with "_newpipeline", and creates the sub-watcher.
watcher.on('addDir', (folderPath) => {
  const folderName = path.basename(folderPath);
  const emailPath = '/mnt/UserData1/mariac06/pathology_image_UNOS/email_data';
  let job_id = '';

  if (folderName.endsWith('_newpipeline')) {
    console.log(`Folder created: ${folderPath}`);

    // Define a sub-watcher for the `ensemble_wsi` subdirectory
    const subWatcher = chokidar.watch(path.join(folderPath, 'ensemble_wsi'), {
      ignored: /(^|[\/\\])\../, // Ignore hidden files
      persistent: true,
      ignoreInitial: true,
    });

    // Execute the 'bashText.sh' script when a .txt file is detected in ensemble_wsi
    subWatcher.on('add', (filePath) => {
      if (filePath.endsWith('/ensembled_group_features_per_sample.csv')) {
        const parts = folderName.split('_');
        const fileid = parts[0];
        handleAddDir(folderPath, fileid)
        .then(job_id => {
          const parts = folderName.split('_');
          const fileid = parts[0];
          
          // Reads from backend-managed file to extract email ID
          fs.readFile(emailPath, 'utf8', (err, data) => {
            if (err) {
              console.error(`Error reading file ${emailPath}: ${err}`);
              return;
            }
            // Extract email ID from the data
            const emailid = extractEmailId(data, fileid);
    
            // Execute the combined bash script, and move the directory into it's designated "user" directory.
            const combinedBashScript = './bashZip.sh';
            exec(`bash ${combinedBashScript} ${fileid} ${emailid} ${job_id}`, (error, stdout, stderr) => {
              if (error) {
                console.error(`Error executing the combined Bash script: ${error}`);
              } else {
                // Check if directory with fileid exists, if not create it
                const fileidDir = `/mnt/UserData1/mariac06/pathology_image_UNOS/${fileid}`;
                fs.mkdirSync(fileidDir, { recursive: true });
                // Stop the watcher before moving the directory
                watcher.close().then(() => {
                  // Rename folderName to job_id and move it to fileidDir
                  fs.rename(folderPath, path.join(fileidDir, job_id), (err) => {
                    if (err) {
                      console.error(`Error moving directory: ${err}`);
                      return;
                    }
                  });
                });
              }
            });
          });
        })
        .catch(err => console.error('Error handling addDir event:', err));
      }
    });    

    subWatcher.on('error', (error) => {
      console.error(`Error watching ensemble_wsi directory: ${error}`);
    });
  }
});

watcher.on('error', (error) => {
  console.error(`Error watching directory: ${error}`);
});
console.log(`Watching for file creation in directory: ${directoryToWatch}`);

// Helper method used for extracting the email address from a designated file
function extractEmailId(data, fileid) {
  try {
      // Parse the JSON data
      const emailData = JSON.parse(data);
      
      // Check if the fileid exists in the email data
      if (fileid in emailData) {
          // Return the corresponding email address
          return emailData[fileid];
      } else {
          // If fileid doesn't exist, return null
          console.error("Fileid "+fileid+" does not exist.");
          return null;
      }
  } catch (error) {
      // If there's an error parsing JSON or accessing data, return null
      console.error(`Error parsing email data: ${error}`);
      return null;
  }
}

// Helper method to get the appropriate arguments based on the "_newtest.txt" file.
async function handleAddDir(folderPath, fileid) {
  const folderName = path.basename(folderPath);
  // one level up for pathology_image_UNOS, cuz folderPath is the ..._newpipeline
  const emailPath = '/mnt/UserData1/mariac06/pathology_image_UNOS/email_data';
  try {
    const pathUnos = path.dirname(folderPath);
    console.log("Checking "+pathUnos+" for a _newtest.txt file for "+fileid);
    const files = await fs.promises.readdir(pathUnos);
    const matchingFile = files.find(file => file.startsWith(fileid) && file.endsWith("_newtest.txt"));
  
    // GETTING THE FILE_ID FROM ..._newtest.txt
    if (!matchingFile) {
      console.log("No matching file found.");
      return;
    }
  
    const firstUnderscoreIndex = matchingFile.indexOf('_');
    const secondLastUnderscoreIndex = matchingFile.lastIndexOf('_', matchingFile.lastIndexOf('_') - 1);
    const thirdLastUnderscoreIndex = matchingFile.lastIndexOf('_', secondLastUnderscoreIndex - 1);

    if (firstUnderscoreIndex === -1 || thirdLastUnderscoreIndex === -1) {
      console.log("Invalid filename format.");
      return;
    }
  
    const identifyingNumberString = matchingFile.substring(firstUnderscoreIndex + 1, thirdLastUnderscoreIndex);
    job_id = identifyingNumberString;
    console.log("Job_id:", identifyingNumberString);

    return identifyingNumberString; // Return the job_id from the function
  } catch (err) {
    console.error('Error reading directory:', err);
    return ''; // Return empty string if an error occurs
  }
}