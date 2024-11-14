import React from 'react'
import { Link } from "react-router-dom"
import { getAuth, signOut } from 'firebase/auth';
import mtslogo from "./images/mtslogo.jpg"

const isLoggedIn = window.localStorage.getItem("isLoggedIn")==="true";
const auth = getAuth();

/**
 * Handles user logout by calling Firebase's signOut method.
 * It removes the "isLoggedIn" and "user_id" from localStorage and reloads the page.
 */
const logOut = (e) => {
  signOut(auth).then(() =>{
    e.preventDefault();
    window.localStorage.removeItem("isLoggedIn")
    window.localStorage.removeItem("user_id")
    window.location.reload();
  });  
}

export default function Navbar() {
  return (
  <nav className="nav">
    <div className='nav-left'>
    <Link to="/" className="nav-left-link">
      <img className="navImg" src={mtslogo} width="70" height="70" alt=""></img>
       <h1 className="site-title">KidneyTx-AI</h1></Link>
       <p className='nav-desc'>A Deep Learning Framework for Advanced Pathological Assessment in Kidney Transplantation</p>
    </div>
    {/* Conditional rendering: show logout button if logged in, login button otherwise */}
    {isLoggedIn ? (
        <div className='nav-button'>
          <button className="logout-button" onClick={logOut}>Logout</button>
        </div>
      ) : (
        <div className='nav-button'>
          <Link to="./login">
            <button className='logout-button'>Login</button>
          </Link>
        </div>
      )}
  </nav>
  )
}
