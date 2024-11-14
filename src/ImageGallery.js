import React, { useState, useEffect } from 'react';
import axios from 'axios';
/**
 * ImageGallery Component
 * 
 * This component fetches and displays a gallery of images based on the provided firebase user ID and folder ID. 
 * It makes an API call to retrieve the images, which are then displayed in a responsive gallery layout.
 * 
 * @param {string} userId - The ID of the user whose images are to be fetched.
 * @param {string} folderId - The ID of the folder containing the images to be displayed.
 * 
 * @component
 * @example
 * const userId = 'user123';
 * const folderId = 'folder456';
 * return <ImageGallery userId={userId} folderId={folderId} />;
 */
const ImageGallery = ({ userId, folderId }) => {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (userId && folderId) {
        try {
          const response = await axios.get(`http://localhost:3001/images?userid=${userId}&folderid=${folderId}`);
          console.log("Fetch userid/folderid: ", userId, folderId);
          setImages(response.data);
          console.log(response.data);
        } catch (error) {
          console.error('Error fetching images:', error);
        }
      } else {
        console.log("An image has not been selected yet.");
      }
    };

    fetchData();
  }, [userId, folderId]);

  return (
    <div className='output-right'>
      <h2>Image Gallery</h2>
      <div className='gallery-div'>
        {images.map((image, index) => (
          <img key={index} src={image} alt={`Image ${index}`} style={{ maxWidth: '100%', margin: '5px' }} />
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;
