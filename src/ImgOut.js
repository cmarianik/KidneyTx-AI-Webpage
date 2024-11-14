import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ImageGallery from './ImageGallery';
import AreaChart from './AreaChart';

/**
 * ImgOut Component
 * 
 * This component fetches and displays pathological data from the database and corresponding images related to kidney biopsies.
 * It renders two tables showing detailed kidney data, an image gallery for viewing biopsy images, and an interactive AreaChart for visualization.
 * 
 * @component
 * 
 * @example
 * return <ImgOut />;
 */
const ImgOut = () => {
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const user_id = window.localStorage.getItem("user_id");

  // Displaying DB info
  const [imageData, setImageData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // for the additional data for graph
  const [additionalData, setAdditionalData] = useState([]); // New state for additional data

  /**
   * Fetches biopsy-related data from the database when the component mounts.
   * The data is retrieved based on `file_ids` stored in localStorage.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await dbinfo();
        setIsLoading(false);

        const additionalData = response.map(item => ({
          PID: item.file,
          kidney_donor_quality_score: item.kdqs,
          predicted_obsolete_glomeruli_percentage: item.schl_glom,
          Es_Weighted_Abnormal_Artery_BG_Perct: item.aif,
          Total_Scaring_Px_Interstitial_Perct: item.isa,
          kdpi: item.kdpi,
        }));
        setAdditionalData(additionalData);
      } catch (err) {
        setError(err.message || 'Failed to fetch data');
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleImageLinkClick = (fileName) => {
    console.log("Retrieving image for: ", fileName);
    setSelectedFolderId(fileName);
  };

  /**
   * Fetches image and biopsy data from the server using file IDs stored in localStorage.
   * 
   * @async
   * @function
   * @returns {Promise<Object[]>} - Returns the image data from the database.
   */
  const dbinfo = async () => {
    try {
      const imgListString = window.localStorage.getItem('imgList');
      if (!imgListString) {
        console.error('No imgList found in localStorage.');
        return;
      }

      const imgList = JSON.parse(imgListString);
      //console.log("Retrieving data for " + imgList);
      const strIL = JSON.stringify(imgList);

      const response = await axios.get('http://localhost:3001/db_info', {
        params: { file_ids: strIL }
      });
      setImageData(response.data);
      //console.log('Data from database:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching data from database:', error.response ? error.response.data : error.message);
    }
  };

  /**
   * TableOne Component
   * 
   * Renders the first table containing biopsy metrics such as glomeruli counts and percentages.
   * 
   * @param {Object[]} data - Array of data objects containing biopsy-related metrics.
   * @returns {JSX.Element} The rendered table.
   */
  const TableOne = ({ data }) => {
    return (
      <table className='output-table'>
        <thead>
          <tr>
            <th>File Name</th>
            <th>Base Size</th>
            <th>Cortex Size</th>
            <th>Normal Glomeruli Count</th>
            <th>Abnormal Glomeruli Count</th>
            <th>Schlerotic Glomeruli (GS%)</th>
            <th>Arterial Intimal Fibrosis (AIF%)</th>
            <th>Interstitial Space Abnormality (ISA%)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.file}</td>
              <td>{item.base_size}</td>
              <td>{item.cortex_size}</td>
              <td>{item.norm_glom}</td>
              <td>{item.abnorm_glom}</td>
              <td>{item.schl_glom}</td>
              <td>{item.aif}</td>
              <td>{item.isa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  /**
   * TableTwo Component
   * 
   * Renders the second table containing prediction scores and recommendations, along with an option to view images.
   * 
   * @param {Object[]} data - Array of data objects containing prediction and recommendation metrics.
   * @returns {JSX.Element} The rendered table.
   */
  const TableTwo = ({ data }) => {
    return (
      <table className='output-table'>
        <thead>
          <tr>
            <th>KDPI</th>
            <th>KDQS</th>
            <th>Recommendation (Initial Decision)</th>
            <th>1 Year Model Score</th>
            <th>Recommendation (Final Decision)</th>
            <th>4 Year Model Score</th>
            <th>Post-transplant Risk</th>
            <th>Image Preview</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.isa == 0.00 ? <span style={{ textDecoration: 'line-through' }}>N/A</span> : item.kdpi}</td>
              <td>{item.isa == 0.00 ? <span style={{ textDecoration: 'line-through' }}>N/A</span> : item.kdqs}</td>
              <td>{item.isa == 0.00 ? <span style={{ textDecoration: 'line-through' }}>N/A</span> : item.risk}</td>
              <td>{item.isa == 0.00 ? <span style={{ textDecoration: 'line-through' }}>N/A</span> : item.year_1_score}</td>
              <td>{item.isa == 0.00 ? <span style={{ textDecoration: 'line-through' }}>N/A</span> : item.year_1_rec}</td>
              <td>{item.isa == 0.00 ? <span style={{ textDecoration: 'line-through' }}>N/A</span> : item.year_4_score}</td>
              <td>{item.isa == 0.00 ? <span style={{ textDecoration: 'line-through' }}>N/A</span> : item.year_4_rec}</td>
              <td>
                <button onClick={() => handleImageLinkClick(item.file)}>
                  Click to View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="output-fullscreen">
      <h1>Pathological Diagnosis Report</h1>
      <div className="output-container">
        <div className="output-left">
          <div className='out-left-top'>
            <h1>Report Table</h1>
            {isLoading ? (
              <p>Loading...</p>
            ) : imageData.length > 0 ? (
              <>
                <TableOne data={imageData} />
                <TableTwo data={imageData} />
              </>
            ) : (
              <p>No data to display</p>
            )}
          </div>
        </div>
        <ImageGallery userId={user_id} folderId={selectedFolderId} />
      </div>
      <AreaChart additionalData={additionalData} />
    </div>
  );
};

export default ImgOut;
