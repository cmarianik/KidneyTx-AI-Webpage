import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import wsi_example from './images/wsi_prediction.jpg';
import up_img from './images/upload.png';
import result_img from './images/results.png';
import OngoingNotif from './OngoingNotif';

let isLoggedIn = window.localStorage.getItem("isLoggedIn")==="true";
let user_id = window.localStorage.getItem("user_id");


export default function Home() {
  const [ongoing, setongoing] = useState(false);
  return (
    <div className="home-screen">

      {isLoggedIn && <OngoingNotif user_id={user_id} setongoing={setongoing}/>}


      <h1 className="home-title">A Deep-learning Based Pathological Assessment <br></br>
            of Procurement Kidney Biopsies for Organ Utilization</h1>
      <div className="home-container">
        <div className="home-left">
            <p>This toolset applies CNN deep learning models to recognize
              kidney tissue compartments in H&E stained sections from
              frozen procurement biopsies and extract three major
              whole-slide abnormality features: Sclerotic Glomeruli (GS)%,
              Arterial Intimal Fibrosis (AIF)%, and Interstitial Space
              Abnormality (ISA)%. A Kidney Donor Quality Score (KDQS)
              will be derived and used alone or in combination with
              demographic and clinical factors to assess post-transplant
              graft loss risk and guide organ utilization.
            </p>
            <div className="home-buttons-container">
              {isLoggedIn ? (
                <div className="home-buttons-container">
                  <Link className={`home-buttons ${ongoing ? 'disabled' : ''}`} to={ongoing ? '#' : "imgscan"} onClick={(e) => { if (ongoing) e.preventDefault();}}>
                    <div className="home-buttons-inside">
                      <img src={up_img} className={`home-img ${ongoing ? 'disabled-image' : ''}`} />
                      <h4>Upload Images</h4>
                    </div>
                  </Link>
                  <Link className="home-buttons" to="joblist">
                    <div className="home-buttons-inside">
                      <img src={result_img} className='home-img'/>
                      <h4>View Job List</h4>
                    </div>
                  </Link>
                </div>
              ) : (
                <p>Please <Link className="link" to="login">Login</Link> or <Link className="link" to="register">sign up</Link> and start to use!</p>
              )}
            </div>
                 
        </div>
        <div className='home-right'>
          <img src={wsi_example} alt="wsi_example" />
        </div>
      </div>
      <div className='home-citations'>
            <h4>Citation and Contact</h4>
            <p>Yi, Z., et al., <em><a className='link' href="https://pubmed.ncbi.nlm.nih.gov/37923131/">A large-scale retrospective study enabled deep-learning based pathological assessment of frozen procurement kidney
biopsies to predict graft loss and guide organ utilization.</a></em> Kidney International, 2023. </p>
      </div> 
    </div>
  )
}
