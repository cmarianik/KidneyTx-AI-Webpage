import React, { useState } from 'react'
import { Link, useNavigate } from "react-router-dom"
import Notification from './Notification'; // Import the Notification component
import axios from 'axios';
import { getAuth, onAuthStateChanged } from "firebase/auth";


/**
 * ImgScan Component handles the process of uploading and submitting images along with clinical information.
 * It allows users to select an image file, input various related clinical data, and submit this data 
 * to a backend server for processing. It also manages notifications and displays a list of submitted images.
 */
export default function ImgScan(props) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isFilePicked, setIsFilePicked] = useState(false);
    const [imageData, setImageData] = useState('');
    const [scannerChecked, setScanCheck] = useState(true);
    const [wedgeChecked, setWedgeCheck] = useState(false);
    const [kdpi, setKdpi] = useState('');
    const [wsi, setWSI] = useState('');
    // Clinical fields
    const [coldisc, setColdisc] = useState('')
    const [recage, setRecage] = useState('')
    const [pumpChecked, setPumpChecked] = useState(false)
    const [lymph, setLymph] = useState('')
    const [skipChecked, setSkipChecked] = useState(false);
    // deprecated: non-scanner images are no longer supported.
    const [nonScanForm, setnSF] = useState('');
    const [nonScanPow, setnSP] = useState('');
    const [entryList, setEntryList] = useState([]);
    const [entryListClinic, setEntryListClinic] = useState([]);
    const [entryListDB, setEntryListDB] = useState([]);
    const [base64Images, set64Images] = useState([]);
    const [popupOn, setPopupOn] = useState(false);
    const user_id = window.localStorage.getItem("user_id");
    const [notification, setNotification] = useState('');
    // for database job_id
    const [jobid, setjobid] = useState('');
    const auth = getAuth();
    let email = '';

    // Monitor authentication state changes
    onAuthStateChanged(auth, (user) => {
      if (user !== null) {
        user.providerData.forEach((profile) => {
          email = profile.email;
        });
      }
    });

    // Function to show notification
    const showNotification = (message) => {
      setNotification(message);
      // Clear notification after 3 seconds
      setTimeout(() => {
          setNotification('');
      }, 3000);
    };

    // Checkbox handlers for conditional rendering
    const onCheckScanner = (e) => {
      setScanCheck(e.target.checked);
    }
    const onWedgeScanner = (e) => {
      setWedgeCheck(e.target.checked);
    }
    const onPumpScanner = (e) => {
      setPumpChecked(e.target.checked);
    }
    const onSkipCheck = (e) => {
      setSkipChecked(e.target.checked);
    }

    // File change handler
    const changeHandler = async (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setIsFilePicked(true);
      
        if (file) {
          try {
            const imageData = await readFileAsDataURL(file);
            setImageData(imageData);
          } catch (error) {
            console.log("Error: ", error);
          }
        }
      };

      // Reads a file and returns a base64 string. Promise required.
      const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target.result);
          };
          reader.onerror = (error) => {
            reject(error);
          };
          reader.readAsDataURL(file);
        });
      };

    // Handle form submission and validation
    const handleSubmission = (event) => {
      event.preventDefault();
      if(entryList.length >= 5){
        console.log("image maximum surpassed");
        showNotification("Cannot submit more than 5 images per job.");
        return;
      }
      if (!isFilePicked) {
        console.log("pick an image");
        return;
      }
      if (kdpi.trim() === '') {
        console.log("KDPI field is required");
        return;
      }
      if (wsi.trim() === '') {
        console.log("WSI field is required");
        return;
      }
      if (!scannerChecked) {
        if (nonScanForm.trim() === '') {
          console.log("Scanner is ", scannerChecked);
          console.log("If not from a Scanner, Image Format must be provided");
          return;
        }
        if (nonScanPow.trim() === '') {
          console.log("If not from a Scanner, Image Resolution must be provided");
          return;
        }
      }

      // entry for image data
      const newEntry = {
        user_id: user_id,
        subKDPI: kdpi,
        subWSI: wsi,
        scanned: scannerChecked ? 'y' : 'n',
        imgF: nonScanForm,
        imgP: nonScanPow,
        wedgeSlide: wedgeChecked ? '1' : '0',
        skipyn: skipChecked ? 'y' : 'n',
        file_id: selectedFile ? selectedFile.name : '',
        job_id: jobid,
      };

      // entry for clinical data
      const newEntry2 = {
        user_id: user_id,
        subKDPI: kdpi,
        coldIsc: coldisc,
        recAge: recage,
        pumped: pumpChecked ? 'Y' : 'N',
        induction: lymph,
        file_id: selectedFile ? selectedFile.name : '',
        job_id: jobid,
      };

      // combined entry for database information
      const newEntryDB = {
        file_id: selectedFile ? selectedFile.name : '',
        kdpi: kdpi,
        // clinical data
        induction: lymph,
        age: recage,
        pump: pumpChecked ? 'Y' : 'N',
        cit: coldisc,
        // username for searching
        user_id: user_id,
        job_id: jobid
      }

      // Shallow copy and add new entry to list
      setEntryList([...entryList, newEntry]);
      setEntryListClinic([...entryListClinic, newEntry2]);
      setEntryListDB([...entryListDB, newEntryDB]);
      set64Images([...base64Images, selectedFile]);

      // Clear form fields after submission
      setSelectedFile(null);
      setIsFilePicked(false);
      setImageData('');

      // Disable if there are entries
      if(entryList.length = 0){
        setScanCheck(false);
        setnSF('');
        setnSP('');   
        setWSI('');
        setWedgeCheck(false);
        setSkipChecked(false);
      } 
      setKdpi('');
      //visual reset.
      document.getElementById("scanForm").reset();
      // Resetting the clinical state variables
      setColdisc('');
      document.getElementById("kdpi").value="";
      setRecage('');
      document.getElementById("rage").value="";
      document.getElementById("cischemia").value="";
      setPumpChecked(false);
      document.getElementById("pump").checked = false;
      setLymph('None');
      document.getElementById("lymdeplete").selectedIndex = 0;


      showNotification('Image added successfully!');
    };
    
    // Final submission of collected data
    const trueSubmit = async () =>{
      try {
        // Loop through each entry and submit image and data to the backend
        for (const [index, entry] of entryList.entries()) {
          const formData = new FormData();
          formData.append("entry", JSON.stringify(entry));
          formData.append("image", base64Images[index]);
          // Send POST request with the entry and associated image
          const response = await axios.post('http://localhost:3001/data-array', formData);
          console.log(response.data);
          // Log each form data key-value pair
          formData.forEach((value, key) => {
            console.log(`${key}: ${value}`);
          });
        }
        
        // Call the Python script for processing the entries
        const response = await axios.post('http://localhost:3001/test_script', { entries: entryList },{
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then(response => {
          console.log(response.data);
        })
        .catch(error => {
          console.error(error.response.data);
        });  

        // Call the second Python script for clinical data
        const clinic_response = await axios.post('http://localhost:3001/script_clinical', { entries: entryListClinic },{
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then(clinic_response => {
          console.log(clinic_response.data);
        })
        .catch(error => {
          console.error(error.clinic_response.data);
        });

        // Get current user's email from authentication
        const user = auth.currentUser;
        let email = '';
        user.providerData.forEach((profile) => {
          email = profile.email;
        });
        // Store user email in backend
        const email_response = await axios.post('http://localhost:3001/email_storage', {
          user_id: user_id,
          email: email
        })
        .then(response => {
          console.log(response.data);
        })
        .catch(error => {
          console.error(error);
        });


        // Get the last file_id without extension for job history
        const lastFileId = entryList[entryList.length - 1].file_id.replace(/\.[^.]+$/, '');

        // Store the database entries
        const db_post_response = await axios.post('http://localhost:3001/initkid', { entry: entryListDB }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });  
      }catch (error) {
        console.error("Error submitting", error);
      }
      // Display submission confirmation popup
      setPopupOn(true);
    }

    // Function to handle deleting an entry
    const handleDelete = (index) => {
      const updatedList = [...entryList];
      updatedList.splice(index, 1);
      setEntryList(updatedList);
      const updatedList2 = [...base64Images];
      updatedList2.splice(index, 1);
      set64Images(updatedList2);
      const updatedList3 = [...entryListClinic];
      updatedList3.splice(index, 1);
      setEntryListClinic(updatedList3);
      const updatedListDB = [...entryListDB];
      updatedListDB.splice(index, 1);
      setEntryListDB(updatedListDB);
      showNotification('Image deleted successfully!');
    };

  
    return (
    <div className="input-fullscreen">
        <div className="login-container">
          <label htmlFor="jobid">Job Name</label>
          <input type="text" name="jobid" id="jobid"
          onChange={(e) => setjobid(e.target.value)}></input>
        </div>
        {(popupOn) ?(
          <div className='popup-div'>
            <Link to="/">
              <button className='popup-button' onClick={() => setPopupOn(false)}>X</button>
            </Link>
            <p>Your images have been submitted. You will receive an notice to the email used to register for this site when the sample is finished. <br /> Thank you for your patience.</p>
          </div>
        ):(
          null
        )}
        <div className="input-full-container">       
          <div className="input-container-inner">
            {/*Form containing image upload and image-related input fields. */}
            <form className="form" id="scanForm"> 
              <h2>Image Information</h2>
              <div>
                <input type="file" accept = "*" name="file"  onChange={changeHandler} />
                
                {(isFilePicked) ?(
                  <div>
                      <p>FileName: {selectedFile.name}</p>
                      <p>Filetype: {selectedFile.type}</p>
                      <p>Size: {(selectedFile.size < 1024 * 1024 * 1024) ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB' : (selectedFile.size / (1024 * 1024 * 1024)).toFixed(1) + ' GB'}</p>
                      <p>
                          lastModifiedDate:{' '}
                          {selectedFile.lastModifiedDate.toLocaleDateString()}
                      </p>
                  </div>
                ):(
                  <p>Select a file to show details</p>
                )}
              </div>
              {/* scanner implementation has been removed; currently unsupported */}
              {/* <div className="input-group-check">
                <label htmlFor="scanner">Is this image from a Scanner?</label>
                <input type="checkbox" name = "scanner" id="scanner"
                value={scannerChecked} onChange={onCheckScanner}
                disabled={entryList.length > 0} // Disable if there are entries
                title={entryList.length > 0 ? "Only one format type allowed per job." : ""}
                ></input>
              </div> */}
              {(!scannerChecked) ?(
                <div className="input-group-hider">
                  <div className="input-group">
                    <label htmlFor="imgFormat">Format</label>
                    <input type="text" name="imgFormat" id="imgFormat"
                    onChange={(e) => setnSF(e.target.value)}></input>
                  </div>

                  <div className="input-group">
                    <label htmlFor="resolution">Image Resolution</label>
                    <input type="number" name = "resolution" id="resolution"
                    onChange={(e) => setnSP(e.target.value)}></input>
                  </div>
                </div>  
                ):(<div className="input-group-check">
                <label htmlFor="wsi">WSI Format</label>
                <select name = "wsi" id="wsi"
                onChange={(e) => setWSI(e.target.value)}
                disabled={entryList.length > 0} // Disable if there are entries
                title={entryList.length > 0 ? "Only one format type allowed per job." : ""}
                >
                  <option value="tif">tif</option>
                    <option value="svs">svs</option>
                    <option value="dcm">dcm</option>
                    <option value="ndpi">ndpi</option>
                    <option value="vms">vms</option>
                    <option value="vmu">vmu</option>
                    <option value="scn">scn</option>
                    <option value="mrxs">mrxs</option>
                    <option value="svslide">svslide</option>
                    <option value="bif">bif</option>
                    <option value="tiff">tiff</option>
                  </select>
              </div>)}
              
              <div className="input-group-check">
                <label htmlFor="wedge">Is this image from a Wedge Slide?</label>
                <input type="checkbox" name = "wedge" id="wedge"
                value={wedgeChecked} onChange={onWedgeScanner}
                disabled={entryList.length > 0} // Disable if there are entries
                title={entryList.length > 0 ? "Only one format type allowed per job." : ""}
                ></input>
              </div>
              <div className="input-group-check">
                <label htmlFor="skipyn">Skip Fibrosis Score Calculations?</label>
                <input type="checkbox" name="skipyn" id="skipyn"
                value={skipChecked} onChange={onSkipCheck}
                disabled={entryList.length > 0} // Disable if there are entries
                title={entryList.length > 0 ? "Only one format type allowed per job." : ""}
                ></input>
              </div>
            </form>
          </div>
            
          {/* Additional Clinical fields */}
          <div className="input-container-inner">
            <h2>Clinical Information</h2>
            <div className="input-group">
              <label htmlFor="kdpi">KDPI</label>
              <input type="number" name = "kdpi" id="kdpi"
              onChange={(e) => setKdpi(e.target.value)}></input>
            </div>
            <div className="input-group">
              <label htmlFor="cischemia">Cold Ischemia Time (hrs)</label>
              <input type="number" name="cischemia" id="cischemia" 
              onChange={(e) => setColdisc(e.target.value)} />
            </div>
            <div className="input-group">
              <label htmlFor="rage">Recipient Age</label>
              <input type="number" name="rage" id="rage"
              onChange={(e) => setRecage(e.target.value)} />
            </div>
            <div className="input-group-check">
              <label htmlFor="pump">Pump Used?</label>
              <input type="checkbox" name="pump" id="pump"
              value={pumpChecked} onChange={onPumpScanner} />
            </div>
            <div className="input-group-check">
              <label htmlFor="lymdeplete">Induction Type</label>
              <select name="lymdeplete" id="lymdeplete"
              onChange={(e) => setLymph(e.target.value)}>
                <option value="none">None</option>
                <option value="LymDep">Lymphocyte Depletion</option>
                <option value="LND">Lymphocyte Nondepletion</option>
              </select>
            </div>
          </div>
          <div className='add-image-div'>
            <button className="add-image-button" onClick={handleSubmission}>Add Image</button>
          </div>
        </div>
      
        {/* First entrylist table containing image data. */}
        {entryList.length > 0 && (
          <div className="input-table-container">
            <table className="entry-table">
              <thead>
                <tr>
                  <th>File ID</th>
                  <th>KDPI</th>
                  <th>WSI</th>
                  <th>Scanned</th>
                  <th>Wedge Slide</th>
                  <th>Fibrosis Skip</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {entryList.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.file_id}</td>
                    <td>{entry.subKDPI}</td>
                    <td>{entry.subWSI}</td>
                    <td>{entry.scanned}</td>
                    <td>{entry.wedgeSlide}</td>
                    <td>{entry.skipyn}</td>
                    <td>
                      <button className="in-side-delete-button" onClick={() => handleDelete(index)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="true-submit-div">
              <button className="true-submit-button" onClick={trueSubmit}>Submit</button>
            </div>
          </div>
        )}
        {/* Second entrylist table containing clinical data. */}
        {entryListClinic.length > 0 && (
          <div className="input-table-container">
            <h2>Clinic Information</h2>
            <table className="entry-table">
              <thead>
                <tr>
                  <th>File ID</th>
                  <th>KDPI</th>
                  <th>Cold Ischemia</th>
                  <th>Recipient Age</th>
                  <th>Pumped</th>
                  <th>Induction</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {entryListClinic.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.file_id}</td>
                    <td>{entry.subKDPI}</td>
                    <td>{entry.coldIsc}</td>
                    <td>{entry.recAge}</td>
                    <td>{entry.pumped}</td>
                    <td>{entry.induction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {notification && <Notification message={notification} />}
    </div>
  )
}
