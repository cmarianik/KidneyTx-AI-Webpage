import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import download_img from './images/download.jpg';
import delete_img from './images/delete-icon.png';
import zip_img from './images/zip-icon.jpg'

/**
 * JobEntries component manages and displays job entries related to a user's job submissions.
 * Users can select images, download results, reports, or delete specific jobs.
 */
const JobEntries = () => {
  let navigate = useNavigate();
  const [jobEntries, setJobEntries] = useState([]);
  const [loading, setLoading] = useState({});
  const [loading2, setLoading2] = useState({});
  const userid = window.localStorage.getItem("user_id");

  localStorage.removeItem("imgList");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch job entries from the backend for the current user
        const response = await axios.get('http://localhost:3001/kidney_get', {
          params: { username: userid }
        });
        // Map the response to include a checked state for each job and file
        const dataWithCheckedState = response.data.map(job => ({
          ...job,
          isChecked: false,
          file_ids: job.file_ids.map(fileId => ({
            id: fileId,
            isChecked: false
          }))
        }));
        setJobEntries(dataWithCheckedState);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  /**
   * Toggles the checkbox for a job entry and also toggles checkboxes for all associated files.
   * @param {number} index - The index of the job entry in the array
   */
  const toggleJobCheckbox = index => {
    const updatedJobEntries = [...jobEntries];
    updatedJobEntries[index].isChecked = !updatedJobEntries[index].isChecked;
    // Optionally, toggle all file checkboxes when job checkbox is toggled
    updatedJobEntries[index].file_ids.forEach(file => {
      file.isChecked = updatedJobEntries[index].isChecked;
    });
    setJobEntries(updatedJobEntries);
  };

  /**
   * Toggles the checkbox for a specific file in a specific job.
   * @param {number} jobIndex - Index of the job entry
   * @param {number} fileIndex - Index of the file in the job entry
   */
  const toggleFileCheckbox = (jobIndex, fileIndex) => {
    const updatedJobEntries = [...jobEntries];
    updatedJobEntries[jobIndex].file_ids[fileIndex].isChecked = !updatedJobEntries[jobIndex].file_ids[fileIndex].isChecked;
    setJobEntries(updatedJobEntries);
  };

  /**
   * Collects the selected images from the job entries into a localstorage array and navigates to the output page.
   */
  const goOut = (e) => {
    const selectedImages = [];

    jobEntries.forEach(job => {
      job.file_ids.forEach(file => {
        if (file.isChecked) {
          selectedImages.push(file.id);
        }
      });
    });
    console.log(selectedImages);
    window.localStorage.setItem("imgList", JSON.stringify(selectedImages));
    navigate("/imgout");
    window.location.reload();
  }

  /**
   * Fetches the job result ZIP file for a specific job.
   * @param {string} jobid - ID of the job to download
   */
  const getJob = async (jobid) => {
    setLoading(prev => ({ ...prev, [jobid]: true }));
    try {
      console.log("Attempting to download " + jobid + " for user " + userid);
      const response = await axios.get('http://localhost:3001/results', {
        params: {
          username: userid,
          jobid: jobid,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link to trigger the download
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${jobid}_output.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setLoading(prev => ({ ...prev, [jobid]: false }));
    } catch (error) {
      console.error('Error fetching zip file:', error);
      setLoading(prev => ({ ...prev, [jobid]: false }));
    }
  }

  /**
   * Fetches the job report (PDF) for a specific job.
   * @param {string} jobid - ID of the job to download
   */
  const getReport = async (jobid) => {
    setLoading2(prev => ({ ...prev, [jobid]: true }));
    try{
      console.log("Attempting to download zip file " + jobid + " for user " + userid);
      const response = await axios.get('http://localhost:3001/result_report', {
        params: {
          username: userid,
          jobid: jobid,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${jobid}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setLoading2(prev => ({ ...prev, [jobid]: false }));
    } catch (error) {
      console.error('Error fetching report:', error);
      setLoading2(prev => ({ ...prev, [jobid]: false }));
    }
  }

  /**
   * Deletes the ongoing job for the user.
   * @param {string} jobid - ID of the job to delete
   */
  const deleteJob = async (jobid) => {
    try{
      console.log("Attempting to delete "+jobid+" for user "+userid);
      const response = axios.patch('http://localhost:3001/cancel_ongoing', {username: userid, jobname : jobid }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(response);
      } catch (error) {
          console.error('Error removing ongoing job:', error);
      } 
  }

  return (
    <div className='job-fullscreen'>
      <h1 className='joblist-title'>Job Entries</h1>
      <button onClick={goOut} className='login-button'>View Selected Outputs</button>
      <ul className='job-ul'>
        {jobEntries.map((job, index) => (
          <li key={index} className='job-li'>
            <div className='job-container'>
              <label>
                <input
                  type="checkbox"
                  checked={job.isChecked}
                  onChange={() => toggleJobCheckbox(index)}
                />
                <span className='jobname-text'>Job Name: {job.job_id}</span>
              </label>
              {loading[job.job_id] ? (
                <div className="loading-indicator">
                  <div className="spinner" />
                  <span>WARNING: this may take a few minutes</span>
                </div>
              ) : (
                <button onClick={() => getJob(job.job_id)} className='job-dl-button'>
                  <img src={zip_img} className='job-images' alt="Zip" />
                </button>
              )}
              {loading2[job.job_id] ? (
                <div className="loading-indicator">
                  <div className="spinner" />
                  <span>WARNING: this may take a few minutes</span>
                </div>
              ) : (
                <button onClick={() => getReport(job.job_id)} className='job-dl-button'>
                  <img src={download_img} className='job-images' alt="Download" />
                </button>
              )}
              <button onClick={() => deleteJob(job.job_id)} className='job-dl-button'>
                <img src={delete_img} className='job-images' alt="Delete" />
              </button>
            </div>

            <ul className='jobimage-ul'>
              {job.file_ids.map((file, fileIndex) => (
                <li key={fileIndex} className='jobimage-li'>
                  <label>
                    <input
                      type="checkbox"
                      checked={file.isChecked}
                      onChange={() => toggleFileCheckbox(index, fileIndex)}
                    />
                    Image: {file.id}
                  </label>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default JobEntries;
