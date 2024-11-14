# KidneyTx-AI Webpage
This is a webpage for KidneyTx-AI, a deep learning framework for advanced pathological assessment in kidney transplantation. These files cover the webpage and the backend required to communicate with the machine learning pipeline. It was created to allow doctors to quickly access this pipeline to evaluate kidney viability.  
*This repository does not contain the deep learning framework itself, nor the MongoDB database due to privacy and proprietary reasons. Please refer to the [Missing Components](#missing-components) section for setup instructions.*

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/en/download/) (v16.20.2 or higher)
- [Python](https://www.python.org/downloads/) (v3.8 or higher)
- [Pillow](https://pypi.org/project/pillow/)

### Steps to Install

1. **Clone the repository:**
    ```
    git clone https://github.com/username/project-name.git
    ```

2. **Navigate to the project directory:**
    ```
    cd project-name
    ```

3. **Install dependencies for the frontend and backend:**
    ```
    npm install
    ```
    This will install all the dependencies required for both the frontend React app and backend server.

### Starting the Project

#### 1. Start the React frontend
Run the following command in one terminal window to start the React development server:
   ```
   npm start
   ```

#### 2. Start the Backend Server
In a new terminal window, run the following command to start the backend server:
    ```
    node mockServer.js
    ```

#### 3. Start the Chokidar Watcher
In another new termianl window, run the following command to start the Chokidar watcher:
    ```
    node testWatcher.js
    ```

### Missing Components

Certain parts of this project have been redacted due to privacy concerns, including:

- **MongoDB Database**: The project uses a MongoDB Atlas database containing private data, so it is not included in this repository.
- **Machine Learning Pipeline**: The AI portion of this project is proprietary and has been omitted.
- **Email Configuration**: The email sender’s credentials and some file paths are redacted for privacy.

#### Workarounds for Redacted Components

1. **Machine Learning Pipeline**:  
   The machine learning pipeline for processing kidney pathology slides has been omitted. You can set up your own pipeline by modifying the `bashDocker` shell script to use your own Docker container and machine learning code.

2. **MongoDB Database**:  
   You can replace the MongoDB database by installing MongoDB locally or using a cloud-based solution such as [MongoDB Atlas](https://www.mongodb.com/docs/atlas/getting-started/). Update the connection string in your backend code accordingly.

3. **Email Configuration**:  
   To send email notifications, create a new email account and configure the SMTP credentials in `basic_email_results.py`. Be sure to replace `<redacted>` variables with your credentials. Consider using [environment variables](https://www.npmjs.com/package/dotenv) for added security.
