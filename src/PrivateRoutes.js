import { Outlet, Navigate } from 'react-router-dom'

const PrivateRoutes = () => {
  const loggedIn = window.localStorage.getItem("isLoggedIn")==="true";
  return(
    loggedIn ? <Outlet/> : <Navigate to="/login"/>
  )
}

export default PrivateRoutes;