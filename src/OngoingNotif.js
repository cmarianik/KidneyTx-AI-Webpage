// OngoingNotif.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ongoingImg from './images/ongoing-256.png'

/**
 * OngoingNotif Component
 * 
 * This component checks if there is an ongoing job for the logged-in user.
 * It allows the user to cancel the ongoing job if necessary.
 * 
 * @param {string} user_id - The unique firebase identifier for the logged-in user
 * @param {function} setongoing - A function to update the parent component state regarding ongoing job status
 * 
 * @returns {JSX.Element} A notification for the ongoing job with an option to cancel it
 */
const OngoingNotif = ({ user_id, setongoing }) => {
    const [ongoingJob, setOngoingJob] = useState(null);

    useEffect(() => {
        /**
         * Fetches the current ongoing job for the user from the server.
         * If a job is ongoing, the parent component is updated.
         */
        const fetchOngoingJob = async () => {
            try {
                console.log("Checking for ongoing jobs.");
                const response = await axios.get('http://localhost:3001/ongoing_check', {
                    params: { username: user_id },
                });

                if (response.data.job_id) {
                    setOngoingJob(response.data.job_id);
                    // update the parent
                    setongoing(true);
                    window.localStorage.setItem("ongoing", true);
                } else {
                    setOngoingJob(null);
                    setongoing(false);
                    localStorage.removeItem("ongoing");
                }
            } catch (error) {
                console.error('Error checking ongoing job:', error);
                setOngoingJob(null);
            }
        };

        // Call the function to fetch ongoing job when component mounts
        fetchOngoingJob();

        // Optionally, set an interval to check periodically
        const interval = setInterval(fetchOngoingJob, 600000); // Check every 600 seconds

        // Cleanup function to clear interval
        return () => clearInterval(interval);
    }, [user_id]);

    const cancelJob = () => {
        // Add functionality to cancel the ongoing job here
        console.log("Canceling ongoing job...");
        try{
            const response = axios.patch('http://localhost:3001/cancel_ongoing', {username: user_id, jobname : ongoingJob }, {
                headers: {
                  'Content-Type': 'application/json',
                },
            });
            console.log(response);
            window.location.reload();
        } catch (error) {
            console.error('Error removing ongoing job:', error);
        }
    };

    // Render the ongoing job and cancel button if it exists
    return (
        <div className='ongoing-full'>
            {ongoingJob && (
                <div className='ongoing-div'>
                    <div className='ongoing-left'>
                        <img src={ongoingImg} className='ongoing-img'/>
                        <p>Ongoing Job: {ongoingJob}</p>
                        <button onClick={cancelJob}>Cancel Job</button>
                    </div>
                    <div className='ongoing-warning'>
                        <p>Each user may only have one job running at a time. To submit more images, please wait for the current job to finish, or cancel and run with the completed set.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OngoingNotif;
