import React, { useState } from "react"
import Login from './Login'
import Register from './Register'
import PwReset from './PwReset'
import ImgScan from './ImgScan'
import ImgOut from './ImgOut'
import Home from './Home'
import PrivateRoutes from './PrivateRoutes'
import Navbar from "./Navbar"
import JobList from "./JobList"
import Poster from "./ExPost"
import { Route, Routes, Link } from "react-router-dom"


export default function App() {  
  return (
    <>
      <Navbar />
      <Routes>
        {/* If path = / {if loggedIn(render home) else render login}} 
              This automatically redirects attempts at home to login*/}
        <Route path="/" element={<Home/>} />
        <Route path="/login" element={<Login />} />         
        <Route path="/register" element={<Register />} />
        <Route path="/pwreset" element={<PwReset />} />
        <Route element={<PrivateRoutes />}>
          <Route path="/imgscan" element={<ImgScan />} />
          <Route path="/imgout" element={<ImgOut />} />
          <Route path="/joblist" element={<JobList />} />
          <Route path="/exampleposter" element={<Poster />} />
        </Route>
      </Routes>
    </>
  )
}
