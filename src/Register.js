import React, { useState } from 'react'
import Notification from './Notification';
import { Link, useNavigate } from "react-router-dom"
import { auth } from "./firebase"
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function Register(props) {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [name, setName] = useState('');
    let navigate = useNavigate();
    const [popupOn, setPopupOn] = useState(false);
    const [regdone, setRegdone] = useState(false)
    const [notification, setNotification] = useState('');
    const [emailError, setEmailError] = useState(false); // New state for email error

    /**
     * Handles closing the popup and redirecting to the home page after registration.
     */
    const handleClosePopup = () => {
        setPopupOn(false);
        navigate('/');
        window.location.reload();
    };

    /**
     * Handles the registration form submission by creating a user account via Firebase.
     * It also handles the display of any error messages, such as if the email is already in use.
     * 
     * @param {Event} e - The form submission event
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        createUserWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            window.localStorage.setItem("isLoggedIn", "true");
            const user = userCredential.user;
            const uid = user.uid
            console.log(uid);
            window.localStorage.setItem("user_id", uid);
            setPopupOn(true);
            // Reset emailError state
            setEmailError(false);
            // ...
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode);
            console.log(errorMessage);

            if (errorCode === 'auth/email-already-in-use') {
                setEmailError(true);
            }
        });
    }

    return (
    <div>
      <body>
            {(popupOn) ?(
            <div className='popup-div'>
                <Link to="/">
                <button className='popup-button' onClick={handleClosePopup}>X</button>
                </Link>
                <p>Your account has been created. You can now submit samples for testing.</p>
            </div>
            ):(
            null
            )}
            <div className="full-screen-container">
                <div className="login-container">
                    <h1 className="login-title">Registration</h1>
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="name">Full name</label>
                            <input value={name} onChange={(e) => setName(e.target.value)}type="name" name="name" id="name"></input>
                            <span className="msg">Valid Name</span>
                        </div>
                        <div className={emailError ? "input-group error": "input-group"}>
                            <label htmlFor="email">Email</label>
                            <input value={email} onChange={(e) => setEmail(e.target.value)}type="email" name="email" id="email"></input>
                            <span className="msg">{emailError ? "Existing Email" : ""}</span>
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <input value={pass} onChange={(e) => setPass(e.target.value)}type="password" name="password" id="password"></input>
                            <span className="msg">Incorrect password</span>
                        </div>

                        <button type="submit" className="login-button">Register</button>
                    </form>
                    <Link to="../login">
                        <button className="link-button" type="button">Already have an account? Login here</button>
                    </Link>
                </div>
            </div>
        </body>
        {/* Notification component (conditionally rendered if there is a notification) */}
        {notification && <Notification message={notification} />}
    </div>
  )
}
