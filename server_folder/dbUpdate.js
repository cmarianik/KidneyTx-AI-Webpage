const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pdf = require('html-pdf');

/* This script runs when the pipeline is finished. It does the following:
  * 1. Retrieve the result and clinical data csvs.
  * 2. Use researched formulas to determine kidney viability
  * 3. Update the database with the new data
  * 4. Prepare the html/pdf report
  */
const userId = process.argv[2];
const jobid = process.argv[3];

// Fetches the clinical and result data
async function fetchAndProcessCSVs() {
  try {
    // Fetch CSV data and clinic CSV data in parallel
    const [csvResponse, clinicCSVResponse] = await Promise.all([
      axios.get('http://localhost:3001/csv', {
        params: { username: userId }
      }),
      axios.get('http://localhost:3001/clinic_csv', {
        params: { username: userId, jobid: jobid }
      })
    ]);

    const csvData = csvResponse.data; 
    const clinicCSVData = clinicCSVResponse.data;
    
    // Prepare data for POST request
    const prepostData = fuseData(csvData, clinicCSVData);

    // Finish the math using the combined clinic/csv data
    const postData = postMath(prepostData);

    // Send the postData as a JSON payload in an Axios POST request
    const updateResponse = await axios.patch('http://localhost:3001/updatekid', { updatedb: postData, username: userId, jobid: jobid }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Generate the html report
    generateHtmlReport(userId, jobid, postData);
    convertHtmlToPdf('UYtOhH78jnY1KF1f4ELaupBtuEJ2', 'retest3')
    .then((pdfPath) => {
      console.log(`PDF generated at ${pdfPath}`);
    })
    .catch((error) => {
      console.error('Error generating PDF:', error);
    });
  } catch (error) {
    console.error('Error occurred trying to fetch files/update data:', error.message);
  }
}

// Merges result and clinical data into one for processing.
function fuseData(csvData, clinicCSVData) {
  // Parse clinic CSV data into an object
  const clinicRows = clinicCSVData.split('\n').slice(1); // Skip header
  const clinicData = clinicRows.reduce((acc, row) => {
    const cells = row.trim().split(/\s+/);
    if (cells.length < 6) {
      console.error('Invalid clinic data row:', row);
      return acc;
    }
    const fileName = cells[0];
    acc[fileName] = {
      KDPI: parseFloat(cells[1]),
      Induction: cells[2],
      Recipient_Ag: parseInt(cells[3]),
      PUMP_KI: cells[4],
      CIT: parseInt(cells[5]),
    };
    return acc;
  }, {});

  // Process CSV data and merge with clinic data
  const prepostData = csvData
    .split('\n')
    .slice(1) // Skip header
    .filter(row => row.trim().length > 0) // Filter out empty rows
    .map(row => {
      const cells = row.split(',');
      if (cells.length < 17) {
        console.error('Invalid CSV data row:', row);
        return null; // Skip invalid rows
      }
      console.log('Processing row:', row);
      const fileName = cells[0];
      const baseSize = parseFloat(cells[1]).toFixed(2);
      const cortexSize = parseFloat(cells[2]).toFixed(2);
      const normGlomCount = parseFloat(cells[3]).toFixed(2);
      const abGlomCount = parseFloat(cells[4]).toFixed(2);
      const gsp = (parseFloat(abGlomCount) / (parseFloat(normGlomCount) + parseFloat(abGlomCount))).toFixed(2);
      const aifp = parseFloat(cells[8]).toFixed(2);
      const isp = parseFloat(cells[15]).toFixed(2);

      const mergedData = {
        fileName,
        baseSize,
        cortexSize,
        normGlomCount,
        abGlomCount,
        gsp,
        aifp,
        isp,
        ...clinicData[fileName] // Merge clinic data
      };
      return mergedData;
    })
    .filter(row => row !== null); // Filter out invalid rows
  return prepostData;
}

// HTML report generator, creates a simple report with result tables and a description. To be sent with email.
function generateHtmlReport(userId, jobid, postData) {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
      <style>
          table {
              font-family: Arial, sans-serif;
              border-collapse: collapse;
              width: 100%;
          }
          td, th {
              border: 1px solid #dddddd;
              text-align: left;
              padding: 8px;
          }
          tr:nth-child(even) {
              background-color: #f2f2f2;
          }
      </style>
  </head>
  <body>
      <h2>PATHOLOGY REPORT</h2>
      <p><a href="http://10.5.100.197/">Link to Webpage</a></p>
      <table>
          <tr>
              <th>File Name</th>
              <th>GS%</th>
              <th>AIF%</th>
              <th>IF%</th>
              <th>KDQS</th>
              <th>1-year Risk Score</th>
              <th>1-year Recommendation</th>
              <th>4-year Risk Score</th>
              <th>4-year Recommendation</th>
          </tr>
          ${postData.map(data => `
          <tr>
              <td>${data.file}</td>
              <td>${data.schl_glom}</td>
              <td>${data.aif}</td>
              <td>${data.isa}</td>
              <td>${data.kdqs}</td>
              <td>${data.year_1_score}</td>
              <td>${data.year_1_rec}</td>
              <td>${data.year_4_score}</td>
              <td>${data.year_4_rec}</td>
          </tr>
          `).join('')}
      </table>
      <p>Percentage of sclerotic glomeruli <br>
      The percentage of sclerotic glomeruli (GS%) was calculated as the number of sclerotic glomeruli divided by total number of glomeruli.  <br>
      
      Percentage of arterial intimal fibrosis  <br>
      The percentage of arterial intimal fibrosis (AIF%) was determined by averaging the arithmetic mean and the weighted mean (adjusted for artery sizes) of arterial intimal fibrosis percentages observed in the top three severely affected arteries. <br>
      
      Percentage of interstitial space abnormality <br> 
      The percentage of interstitial space abnormality (IF%) was calculated as the area of enlarged interstitial space divided by the area of total interstitial space within glomeruli enriched regions (cortex sections). <br>
      
      Kidney Donor Quality Score <br> 
      A composite score incorporating KDPI, GS%, AIF%, IF% reflects the overall quality of donor kidney. <br>
      
      1-year and 4-year Risk Score <br>
      The probability scores from logistic regression model by including Cold Ischemia Time, Induction Type, Kidney Donor Quality Score, Use of Pump (Only in 1-year model), and Recipient Age (Only in 4-year model).</p>
      <p>Yi, Z., et al., <em><a className='link' href="https://pubmed.ncbi.nlm.nih.gov/37923131/">A large-scale retrospective study enabled deep-learning based pathological assessment of frozen procurement kidney
      biopsies to predict graft loss and guide organ utilization.</a></em> Kidney International, 2023. </p>
  </body>
  </html>
  `;

  const outputPath = `/mnt/UserData1/mariac06/pathology_image_UNOS/${userId}_newpipeline/${userId}_${jobid}_report.html`;
  fs.writeFileSync(outputPath, htmlContent, 'utf8');
}

// Compute recommendations based on researched formulas.
function postMath(prepostData){
  let TEMPFIXEDCOUNTER=1;
  const postData = prepostData.map(data => {
    const fileName = data.fileName;
    const baseSize = data.baseSize;
    const cortexSize = data.cortexSize;
    const normGlomCount = data.normGlomCount;
    const abGlomCount = data.abGlomCount;
    const gsp = data.gsp;
    const aifp = data.aifp;
    const isp = data.isp;
    const cKDPI = data.KDPI;
    const cInduction = data.Induction;
    const cRAge = data.Recipient_Ag;
    const cPUMP = data.PUMP_KI;
    const cCIT = data.CIT;

    let kgs = 1;
    if (gsp > 0.09) {
      kgs = 2;
    }
    if (gsp <= 0.03) {
      kgs = 0;
    }
    let kaif = 1;
    if (aifp > 0.39) {
      kaif = 2;
    }
    if (aifp <= 0.11) {
      kaif = 0;
    }
    let kif = 1;
    if (isp > 0.39) {
      kif = 2;
    }
    if (isp <= 0.1) {
      kif = 0;
    }

    let kdpi = 1;
    let kdTemp = 0;

    let cifixed = 200;
    let pumpfixed = 'X';
    let inductfixed = 'NA';
    let ragefixed = 500;

    kdTemp = cKDPI;
    cifixed = cCIT;
    inductfixed = cInduction;
    pumpfixed = cPUMP;
    ragefixed = cRAge;
    TEMPFIXEDCOUNTER++;

    if (kdTemp > 0.76) {
      kdpi = 2
    }
    if (kdTemp <= 0.5) {
      kdpi = 0;
    }
    let kdqs = kgs + kaif + kif + kdpi;
    let rec = "";

    // Define transplant recommendation
    if (kdqs < 7) {
      rec = "Proceed to Allocation"
    } else{
      rec = "Discard Immediately"
    }

    // 1 year numbers
    const int1yr = -1.22;
    const cicoef = 0.03;
    const pumpcoef = -1.56;
    const inldcoef = -2.70;
    const inlndcoef = -2.09;
    const kdqs1yr = 0.37;
    
    // 4 year numbers
    const int4yr = 0.12;
    const cicoef4 = 0.02;
    const ragecoef = -0.04;
    const inldcoef4 = -1.76;
    const inlndcoef4 = -1.88;
    const kdqs4yr = 0.40;

    let pumpval = 0;
    let inductval = 0;
    let inductval4 = 0;
    if (pumpfixed === 'Y') {
      pumpval = pumpcoef;
    }
    if (inductfixed === 'LymDep') {
      inductval = inldcoef;
      inductval4 = inldcoef4;
    }
    if (inductfixed === 'LND') {
      inductval = inlndcoef;
      inductval4 = inlndcoef4;
    }
    const yr1T = int1yr + (cicoef * cifixed) + (pumpval) + (inductval) + (kdqs1yr * kdqs);
    const yr4T = int4yr + (cicoef4 * cifixed) + (ragecoef * ragefixed) + (inductval4) + (kdqs4yr * kdqs);
    let y1r = Math.exp(yr1T) / (1 + Math.exp(yr1T));
    y1r = y1r.toFixed(2);
    let y4r = Math.exp(yr4T) / (1 + Math.exp(yr4T));
    y4r = y4r.toFixed(2);

    let rec2 = '';
    let rec3 = '';
    if(y1r >= 0.55){
      rec2 = "Discard";
    }
    else{
      rec2 = "Proceed to Transplant";
    }
    if(y4r >= 0.11){
      rec3 = "High";
    }
    else{
      rec3 = "Low";
    }
    
    // overwrite anything with isa=0
    if(isp == 0){
      rec=null;
      y1r=null;
      rec2=null;
      y4r=null;
      rec3=null;
      kdqs=null;
    }
    
    return {
      file: fileName,
      base_size: baseSize,
      cortex_size: cortexSize,
      norm_glom: normGlomCount,
      abnorm_glom: abGlomCount,
      schl_glom: gsp,
      aif: aifp,
      isa: isp,
      kdpi: kdTemp,
      kdqs: kdqs,
      risk: rec,
      year_1_score: y1r,
      year_1_rec: rec2,
      year_4_score: y4r,
      year_4_rec: rec3,
    }
  })
  return postData;
}

// Generate a pdf report from the html report for easier downloading from frontend.
async function convertHtmlToPdf(userId, jobid) {
  const htmlPath = `/mnt/UserData1/mariac06/pathology_image_UNOS/${userId}_newpipeline/${userId}_${jobid}_report.html`;
  const pdfPath = `/mnt/UserData1/mariac06/pathology_image_UNOS/${userId}_newpipeline/${userId}_${jobid}_report.pdf`;

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Generate PDF from HTML
  return new Promise((resolve, reject) => {
    pdf.create(htmlContent, { format: 'A4' }).toFile(pdfPath, (err, res) => {
      if (err) {
        return reject(err);
      }
      resolve(pdfPath);
    });
  });
}

fetchAndProcessCSVs();