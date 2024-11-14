import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, getAuth, onAuthStateChanged } from 'firebase/auth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [invalidLogin, setInvalidLogin] = useState(false);
    const auth = getAuth();
    let navigate = useNavigate();

    /**
     * useEffect hook to check if the user is already authenticated when the component mounts.
     * If a user is authenticated, they are redirected to the home page.
     */
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

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, [auth, navigate]);

    /**
     * Handles the login form submission by calling Firebase's signInWithEmailAndPassword.
     * If login is successful, the user is redirected. If unsuccessful, an error message is shown.
     * 
     * @param {Event} e - The form submission event
     */
    const handleSubmit = (e) => {
        e.preventDefault();

        signInWithEmailAndPassword(auth, email, pass)
            .then((userCredential) => {
                console.log(userCredential);
                window.localStorage.setItem('isLoggedIn', 'true');
                navigate('/');
                window.location.reload();
            })
            .catch((error) => {
                console.log(error);

                // Updating error states
                if (error.code === 'auth/invalid-login-credentials') {
                    console.log('error detected');
                    setInvalidLogin(true);
                }
            });
    };

    return (
        <div>
            <div>
                <div className="full-screen-container">
                    <div className="login-container">
                        <h1 className="login-title">Welcome. Please Login</h1>
                        <form className="login-form" onSubmit={handleSubmit}>
                            <div className={invalidLogin ? "input-group error" : "input-group"}>
                                <label htmlFor="email">Email</label>
                                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" name="email" id="email" />
                                <span className="msg">{invalidLogin ? "Invalid Login Credentials" : ""}</span>
                            </div>

                            <div className="input-group">
                                <label htmlFor="password">Password</label>
                                <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" name="password" id="password" />
                                <span className="msg">Incorrect password</span>
                            </div>
                            <div className="login-pw-reset">
                                <Link to="../pwreset">Forgot Password?</Link>
                            </div>

                            <button type="submit" className="login-button">Login</button>
                        </form>

                        <Link to="../register">
                            <button className="link-button" type="button">Don't have an account? Register here</button>
                        </Link>

                    </div>
                </div>
            </div>
        </div>
    );
}
