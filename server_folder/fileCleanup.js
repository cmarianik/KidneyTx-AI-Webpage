const fs = require('fs');
const path = require('path');

/* This script runs when the pipeline finishes. It takes a firebase userid as an argument and does the following tasks:
  * 1. Delete non image/data files from the pipeline output folder to conserve space.
  * 2. Delete user input files ending in "_newtest.txt" and "_clinical.txt"
  * 3. Recursively clean out any empty directories leftover.
  */

// Path setup
const [, , userid] = process.argv;
if (!userid) {
  console.error('Please provide a userid as a command line argument.');
  process.exit(1);
}
const targetDir = `/mnt/UserData1/mariac06/pathology_image_UNOS/${userid}_newpipeline`;
const baseDir = '/mnt/UserData1/mariac06/pathology_image_UNOS';

// Helper function to delete a file
const deleteFile = (filePath) => {
  try {
    fs.unlinkSync(filePath);
    console.log(`Deleted file: ${filePath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error deleting file: ${filePath}`, err);
    }
  }
};

// Helper function to recursively delete directories
const deleteDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach(file => {
      const filePath = path.join(dirPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        deleteDirectory(filePath); // recursively delete subdirectories
      } else {
        deleteFile(filePath); // delete files
      }
    });

    // Try to delete the directory if it's empty
    try {
      fs.rmdirSync(dirPath);
      console.log(`Deleted directory: ${dirPath}`);
    } catch (err) {
      if (err.code !== 'ENOTEMPTY') {
        console.error(`Error deleting directory: ${dirPath}`, err);
      }
    }
  }
};

// Helper function to check if a directory contains valid files (image or CSV files)
const containsValidFiles = (dirPath) => {
  return fs.readdirSync(dirPath).some(file => {
    const filePath = path.join(dirPath, file);
    const fileExt = path.extname(file).toLowerCase();
    return fs.lstatSync(filePath).isDirectory() || ['.jpg', '.jpeg', '.png', '.csv'].includes(fileExt);
  });
};

// Delete non-jpeg/png/csv files in the target directory
const deleteNonImageAndCsvFiles = () => {
  const traverseAndDelete = (dir) => {
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        traverseAndDelete(filePath); // Recursively traverse subdirectories

        if (!containsValidFiles(filePath)) {
          deleteDirectory(filePath);
        }
      } else {
        const fileExt = path.extname(file).toLowerCase();
        if (fileExt !== '.jpg' && fileExt !== '.jpeg' && fileExt !== '.zip' && fileExt !== '.html' && fileExt !== '.pdf' && fileExt !== '.png' && !(fileExt === '.csv' && file === 'ensembled_group_features_per_sample.csv')) {
          deleteFile(filePath);
        }
      }
    });
  };
  traverseAndDelete(targetDir);
  // Check if the main target directory is empty after deletion
  if (!containsValidFiles(targetDir)) {
    deleteDirectory(targetDir);
  }
};

// Delete specific files in the base directory
const deleteSpecificFilesInBaseDir = () => {
  fs.readdirSync(baseDir).forEach(file => {
    if ((file.startsWith(userid) && file.endsWith('_newtest.txt')) || (file.startsWith(userid) && file.endsWith('_clinical.txt'))) {
      const filePath = path.join(baseDir, file);
      deleteFile(filePath); // delete specific files in base directory
    }
  });
};

deleteNonImageAndCsvFiles();
deleteSpecificFilesInBaseDir();