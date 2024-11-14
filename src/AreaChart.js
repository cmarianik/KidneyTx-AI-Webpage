import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import kidneyData from './data/kidney_json.json'; // Import the JSON file
import kidneyData3 from './data/kidney_json3.json';

/**
 * AreaChart Component
 * 
 * This component renders two interactive charts: a histogram showing kidney donor quality scores (KDQS) 
 * and scatter plots showing population and user-specific kidney data. It allows filtering of data points
 * for enhanced visualization.
 * 
 * @param {Object[]} additionalData - Array of user-specific data to be plotted alongside the population data.
 * 
 * @component
 * @example
 * const userData = [
 *  { kidney_donor_quality_score: 3, PID: 'User123', GTIME_KI: 200, DCGL: 0, ACGL: 1, M6_eGFR: 60, M12_eGFR: 58 },
 *  { kidney_donor_quality_score: 5, PID: 'User456', GTIME_KI: 300, DCGL: 0, ACGL: 2, M6_eGFR: 65, M12_eGFR: 62 }
 * ];
 * return <AreaChart additionalData={userData} />;
 */
const AreaChart = ({ additionalData }) => {
  // State hooks
  const [chartData, setChartData] = useState([]);          // Population chart data
  const [averageData, setAverageData] = useState([]);      // Average calculated data
  const [tRange, settRange] = useState(100);               // Filter for years since graft
  const [kdqsRange, setKDQSRange] = useState(0);           // KDQS range filter
  const [userKQDSs, setuserKDQSs] = useState([]);          // KDQS values from user data
  const [userFiles, setuserFiles] = useState([]);          // User-specific file data
  const [kdata, setkdata] = useState([]);                  // Adjusted KDQS data for user table
  const [addFilter, setaddFilter] = useState("kdpi");      // Filter for additional data graphs
  let positions = [];                                      // Used to position text on scatter plot
  const [chartdata2, setChartData2] = useState([]);        // Additional chart data
  const [jitteredXData, setJitteredXData] = useState([]);  // X-data with jitter for scatter plot

  useEffect(() => {
    const userData = uUserData(additionalData);
    const filteredData = parseJSON(kidneyData, tRange);
    const sortedData = filteredData.sort((a, b) => a.kidney_donor_quality_score - b.kidney_donor_quality_score);
    setChartData(sortedData);
    const avgData = calculateAverageData(kidneyData);
    setAverageData(avgData);
    const kData = adjustKDQSData(avgData, kdqsRange);
    setkdata(kData);

    const filteredData2 = parseJSON(kidneyData3, tRange);
    const kData2 = filteredData2.sort((a, b) => a[addFilter] - b[addFilter]);
    setChartData2(kData2);
    
    const jitteredX = addJitter(sortedData.map(item => item.kidney_donor_quality_score));
    setJitteredXData(jitteredX);
  }, [tRange, kdqsRange, addFilter]);


  // Function to filter data points by time range
  /**
   * Filters JSON data based on years since graft (`GTIME_KI`).
   * 
   * @param {Object[]} jsonData - The dataset to filter.
   * @param {number} tRange - The threshold for years since graft.
   * @returns {Object[]} Filtered dataset.
   */
  const parseJSON = (jsonData, tRange) => {
    return jsonData.filter(row => {
      const gtime = row.GTIME_KI / 365;
      return gtime < tRange;
    });
  };

  // Calculates average data based on Kidney Donor Quality Score(KDQS)
  const calculateAverageData = (data) => {
    const groupedData = data.reduce((acc, item) => {
      const kdqs = item.kidney_donor_quality_score;
      if (!acc[kdqs]) {
        acc[kdqs] = { 
          GTIME_KI: 0, 
          DCGL: 0, 
          ACGL: 0, 
          M6_eGFRTotal: 0, 
          M6_eGFRCnt: 0, // Count for M6_eGFR
          M12_eGFRTotal: 0, 
          M12_eGFRCnt: 0, // Count for M12_eGFR
          GL_num: 0,
          GL_denom: 0,
          count: 0 
        };
      }
      // Accumulate values
      acc[kdqs].GTIME_KI += item.GTIME_KI;
      acc[kdqs].DCGL += item.DCGL;
      acc[kdqs].ACGL += item.ACGL;
      // Accumulate M6_eGFR only if it's not empty
      if (item.M6_eGFR !== "") {
        acc[kdqs].M6_eGFRTotal += item.M6_eGFR;
        acc[kdqs].M6_eGFRCnt += 1; // Increment count for M6_eGFR
      }
      // Accumulate M12_eGFR only if it's not empty
      if (item.M12_eGFR !== "") {
        acc[kdqs].M12_eGFRTotal += item.M12_eGFR;
        acc[kdqs].M12_eGFRCnt += 1; // Increment count for M12_eGFR
      }
      acc[kdqs].count += 1; // Increment total count

      // graft loss calcs
      if (item.DCGL == 1 && item.GTIME_KI < (tRange*365)){
        acc[kdqs].GL_num +=1;
      }
      if (!(item.DCGL == 0 && item.GTIME_KI < (tRange*365))){
        acc[kdqs].GL_denom +=1;
      }

      return acc;
    }, {}); // {} initializes accumulator to empty.
  
    return Object.entries(groupedData).map(([kdqs, values]) => {
      const totalCount = values.count;
      const GL_rate = values.GL_num / values.GL_denom;
  
      return {
        kidney_donor_quality_score: kdqs,
        GTIME_KI: values.GTIME_KI / totalCount, 
        DCGL: values.DCGL / totalCount, 
        ACGL: values.ACGL / totalCount, 
        M6_eGFR: values.M6_eGFRTotal, // Use average for M6_eGFR
        M12_eGFR: values.M12_eGFRTotal, // Use average for M12_eGFR
        GL_rate: GL_rate,
        GL_num: values.GL_num,
        GL_denom: values.GL_denom,
        m6_cnt: values.M6_eGFRCnt,
        m12_cnt: values.M12_eGFRCnt
      };
    });
  };

  // Function to adjust KDQS data based on user-provided range
  const adjustKDQSData = (data, krange) => {
    let adjAvg = [];
    for (const k in userKQDSs){
      let kmin = userKQDSs[k]-parseInt(krange);
      let kmax = userKQDSs[k]+parseInt(krange);
      // make sure it doesn't exceed boundaries of population data
      if (kmin < 0){
        kmin = 0;
      }
      if (kmax > 8){
        kmax = 8;
      }

      let m6n = 0;
      let m6d = 0;
      let m12n = 0;
      let m12d = 0;
      let gln = 0;
      let gld = 0;
      // add up all the values of the kdqs within range
      for( let i = kmin; i <= kmax; i++){
        m6n += data[i].M6_eGFR;
        m6d += data[i].m6_cnt;
        m12n += data[i].M12_eGFR;
        m12d += data[i].m12_cnt;
        gln += data[i].GL_num;
        gld += data[i].GL_denom;
      }

      // now divide them by the denominators properly
      let m6t = m6n/m6d;
      let m12t = m12n/m12d;
      let glt = gln/gld;

      let kdv = '';
      if(kmin == kmax){
        kdv = kmax;
      }
      else{
        kdv = kmin+"-"+kmax;
      }

      //kv is for file association
      let point = {kdqs: kdv, m6t: m6t, m12t: m12t, glt: glt, kv: userKQDSs[k]};
      adjAvg.push(point);
    }
    return adjAvg;
  }

  // makes an array of user kdqs that need examining
  const uUserData = (data) => {
    let arr = [];
    let arr2 = [];
    for (const point of data){
      arr2.push(point);
      if(!arr.includes(point.kidney_donor_quality_score)){
        arr.push(point.kidney_donor_quality_score);
      }
    }
    setuserFiles(arr2);
    setuserKDQSs(arr);
  }

  // Layout and rendering logic for Plotly charts

  // alternate text positions for user data
  function getPosition(kdqs, positions) {
    if (!positions[kdqs]) {
      positions[kdqs] = 0; // Initialize the position counter for this KDQS
    }
    const positionIndex = positions[kdqs] % 4; // Modulo 4 to cycle through positions
    positions[kdqs]++; // Increment position counter for the next call
    switch (positionIndex) {
      case 0:
        return 'bottom left';
      case 1:
        return 'top right';
      case 2:
        return 'bottom right';
      case 3:
        return 'top left';
      default:
        return 'bottom left';
    }
  }

  const kdqsCounts = chartData.reduce((acc, item) => {
    const kdqs = item.kidney_donor_quality_score;
    acc[kdqs] = (acc[kdqs] || 0) + 1;
    return acc;
  }, {});
  
  const calculatePercentiles = (data) => {
    const scores = data.map(item => item.kidney_donor_quality_score).sort((a, b) => a - b);
    return scores.map((score, index) => ({
      kdqs: score,
      percentile: (index / (scores.length - 1)) * 100
    }));
  };
  const percentiles = calculatePercentiles(chartData);


  // Manual datapoint Jittering (plotly does not support geom_jitter)
  const addJitter = (data, maxJitter = 0.7) => {
    return data.map(x => x + (Math.random() - 0.5) * maxJitter);
  };
  const jitteredX = addJitter(chartData.map(item => item.kidney_donor_quality_score));
  const addJitteredX = addJitter(additionalData.map(item => item.kidney_donor_quality_score));
  // Histogram implementation
  // Create histogram data
  const histogramData = chartData.reduce((acc, item) => {
    const kdqs = item.kidney_donor_quality_score;
    if (!acc[kdqs]) {
      acc[kdqs] = 0;
    }
    acc[kdqs] += 1;
    return acc;
  }, {});
  const histogramX = Object.keys(histogramData).map(Number);
  const histogramY = Object.values(histogramData);

  const layout = {
    title: 'Kidney Donor Quality Score',
    uirevision: 'true',
    xaxis: {
      title: 'KDQS', // X-axis label
      
      automargin: true,
    },
    yaxis: {
      title: '', // Y-axis label
      showticklabels: false,
    },
    width: 1400, // Extend the width of the graph horizontally
    height: 600, // Adjust height
    margin: {
      l: 25,
      r: 25,
      b: 50,
      t: 50,
      pad: 4
    },
    showlegend:true,
    legend: {
      x: 1,
      xanchor: 'right',
      y: 1
    },
  };

  const layout2 = {
    title: 'Other Data',
    uirevision: 'true',
    xaxis: {
      title: 'kdqs'
    },
    yaxis: {
      title: addFilter
    },
    width: 1400,
    height: 600,
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
      pad: 4
    },
    showlegend:true,
    legend: {
      x: 1,
      xanchor: 'right',
      y: 1
    },
  };

  return (
    <div className='output-div2'>
      {/* Chart and data components */}
      <div className='graph-div'>
        <Plot
          data={[
            {
              x: histogramX,
              y: histogramY,
              type: 'bar',
              name: 'Histogram',
              marker: {
                color: '#B3E6FFFF',
                line: {
                  color: 'rgba(100, 100, 100, 1.0)',
                  width: 1
                }
              },
            },
            {
              y: chartData.map((item, index) => {
                const kdqs = item.kidney_donor_quality_score;
                const count = kdqsCounts[kdqs] || 1;
                return index % count;
              }),
              x: jitteredX,
              type: 'scatter',
              mode: 'markers', // Change mode to 'markers' to show dots
              marker: {
                color: 'blue',
                size: 3
              },
              text: chartData.map(item => 
                `GTIME_KI: ${item.GTIME_KI}<br>DCGL: ${item.DCGL}<br>ACGL: ${item.ACGL}<br>M6_eGFR: ${item.M6_eGFR}<br>M12_eGFR: ${item.M12_eGFR}`
              ),
              hoverinfo: 'text',
              name: 'Population Data'
            },
            {
              y: additionalData.map((item, index) => {
                const kdqs = item.kidney_donor_quality_score;
                const count = kdqsCounts[kdqs] || 1;
                return count;
              }),
              x: addJitteredX,
              type: 'scatter',
              mode: 'markers+text',
              marker: {
                color: 'red',
                size: 10 // Larger size for the additional data points
              },
              text: additionalData.map((item, index) => {
                const kdqs = item.kidney_donor_quality_score;
                const percentileObj = percentiles.find(p => p.kdqs === kdqs);
                const percentileText = percentileObj ? `Percentile: ${Math.round(percentileObj.percentile)}%` : '';
                return `File: ${item.PID}<br>KDQS: ${kdqs}<br>${percentileText}`;
              }),
              textposition: additionalData.map(item => getPosition(item.kidney_donor_quality_score, positions)),
              textfont: {
                family: 'Arial, sans-serif',
                size: 12,
                color: 'black',
                weight: 'bold' // Set the font weight to bold
              },
              hoverinfo: 'text',
              name: 'User Data',
              hoverlabel: { bgcolor: 'white', font: { size: 12 }, bordercolor: 'black' },
              showlegend: true
            }
          ]}
          layout={layout}
        />
        {/* Filter input fields and user table */}
        <div className='graph-input'>
            <label htmlFor='tRange'>Years Since Graft: </label>
            <input type="number" id="tRange" onChange={(e)=> settRange(e.target.value)} />
            <br/>
            <label htmlFor='kdqsRange'>KDQS Range: </label>
            <input type="number" id="kdqsRange" onChange={(e)=> setKDQSRange(e.target.value)} />
            <table className='output-table'>
              <thead>
                <tr>
                  <th>File(s)</th>
                  <th>KDQS</th>
                  <th>Graft Loss Rate</th>
                  <th>M6_eGFR</th>
                  <th>M12_eGFR</th>
                </tr>
              </thead>
              <tbody>
                {kdata.map((item, index) => (
                  <tr key={index}>
                    <td>{userFiles.filter(file => file.kidney_donor_quality_score === item.kv).map(file => file.PID).join(', ')}</td>
                    <td>{item.kdqs}</td>
                    <td>{item.glt.toFixed(2)}</td>
                    <td>{item.m6t.toFixed(2)}</td>
                    <td>{item.m12t.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>     
      </div>
      <div className='additional-graphs'>
        <Plot
          data={[
            {
              x: chartdata2.map(item => item.KDQS),
              y: chartdata2.map(item => item[addFilter]),
              type: 'box',
              name: 'Box Plot',
              marker: {
                color: '#4C87F5', // Semi-transparent blue for the box plot
              },
              boxpoints: false, // Disable outlier points in the box plot (we will use scatter plot for points)
            },
            {
              x: chartdata2.map(item => item.KDQS),
              y: chartdata2.map(item => item[addFilter]),
              type: 'scatter',
              mode: 'markers',
              marker: {
                color: 'blue',
                size: 4
              },
              text: chartdata2.map(item => 
                `KDQS: ${item.KDQS}<br>Base_Size: ${item.Base_Size_1000000_pw10}<br>Cortex_Size: ${item.Cortex_Size_1000000_pw10}<br>Normal_Glo: ${item.Normal_Glo_count}<br>Abnormal_Glo: ${item.Abnormal_Glo_count}<br>Interstitial_Scarring%: ${item.Total_Scaring_Px_Interstitial_Perct}<br>Predicted_Obsolete_Glomeruli: ${item.predicted_obsolete_glomeruli_percentage}<br>GTIME_KI: ${item.GTIME_KI}<br>DCGL: ${item.DCGL}<br>ACGL: ${item.ACGL}<br>kdpi: ${item.kdpi}<br>CPRA: ${item.CPRA}<br>EPTS: ${item.EPTS}<br>M6_eGFR: ${item.M6_eGFR}<br>M12_eGFR: ${item.M12_eGFR}`
              ),
              hoverinfo: 'text',
              name: 'Population Data'
            },
            {
              x: additionalData.map(item => item.kidney_donor_quality_score),
              y: additionalData.map(item => item[addFilter]),
              type: 'scatter',
              mode: 'markers+text',
              marker: {
                color: 'red',
                size: 10 // Larger size for the additional data points
              },
              text: additionalData.map(item =>
                `File: ${item.PID}<br> KDQS: ${item.kidney_donor_quality_score}<br> GS% ${item.predicted_obsolete_glomeruli_percentage}<br> AIF% ${item.Es_Weighted_Abnormal_Artery_BG_Perct}<br> ISA% ${item.Total_Scaring_Px_Interstitial_Perct}<br> KDPI ${item.kdpi}`
              ),
              textposition: additionalData.map(item => getPosition(item.kidney_donor_quality_score, positions)),
              textfont: {
                family: 'Arial, sans-serif',
                size: 12,
                color: 'black',
                weight: 'bold' // Set the font weight to bold
              },
              hoverinfo: 'text',
              name: 'User Data',
              hoverlabel: { bgcolor: 'white', font: { size: 12 }, bordercolor: 'black' },
              showlegend: true
            }
          ]}
          layout={layout2}/>
        <label htmlFor='filter2'>Filter: </label>
        {/* dropdown leads with kdpi cuz it defaults to that */}
        <select name="filter2" id="filter2" onChange={(e)=> setaddFilter(e.target.value)}>
          <option value="kdpi">KDPI</option>
          <option value="Es_Weighted_Abnormal_Artery_BG_Perct">Abnormal Artery BG %</option>
          <option value="Total_Scaring_Px_Interstitial_Perct">Interstitial Scarring %</option>
          <option value="predicted_obsolete_glomeruli_percentage">Predicted Obsolete Glomeruli %</option>
          <option value="M6_eGFR">M6_eGFR</option>
          <option value="M12_eGFR">M12_eGFR</option>
        </select>
      </div>
    </div>
  );
};

export default AreaChart;
