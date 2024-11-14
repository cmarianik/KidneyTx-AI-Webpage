import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail, getAuth, onAuthStateChanged } from 'firebase/auth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [pass2, setPass2] = useState('');
    const [pwMatch, setPwMatch] = useState(false);
    const [invalidLogin, setInvalidLogin] = useState(false);
    const auth = getAuth();
    let navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                const uid = user.uid;
                console.log(uid);
                window.localStorage.setItem('user_id', uid);
                navigate('/');
                window.location.reload();
            } else {
                // User is signed out
                console.log('user is null');
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [auth, navigate]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Firebase sends automated password reset email.
        sendPasswordResetEmail(auth, email)
            .then((userCredential) => {
                console.log("Password Reset Email Sent!");
            })
            .catch((error) => {
                console.log(error);
            });
    };

    return (
        <div>
            <div>
                <div className="full-screen-container">
                    <div className="login-container">
                        <form className="login-form" onSubmit={handleSubmit}>
                            <div className={invalidLogin ? "input-group error" : "input-group"}>
                                <label htmlFor="email">Please enter the email used to register:</label>
                                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" name="email" id="email" />
                                <span className="msg">{invalidLogin ? "Invalid Login Credentials" : ""}</span>
                            </div>
                            <button type="submit" className="login-button">Send Password Reset Email</button>
                        </form>

                    </div>
                </div>
            </div>
        </div>
    );
}
