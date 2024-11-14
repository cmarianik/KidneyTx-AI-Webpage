import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Command-line arguments
email = sys.argv[1]
userId = sys.argv[2]
jobid = sys.argv[3]

# Email configuration
sender_email = '<redacted>'
sender_password = '<redacted>'
receiver_email = email
subject = 'KidneyTx-AI Results'

# Path to the generated HTML report file
report_file_path = "/mnt/UserData1/mariac06/pathology_image_UNOS/{}_newpipeline/{}_{}_report.html".format(userId, userId, jobid)
# Read the HTML content from the file
with open(report_file_path, "r") as file:
    html_content = file.read()

# Create a multipart message
msg = MIMEMultipart("alternative")
msg['From'] = sender_email
msg['To'] = receiver_email
msg['Subject'] = subject
msg.attach(MIMEText(html_content, "html"))

# Connect to the SMTP server (Gmail) and send.
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login(sender_email, sender_password)
server.sendmail(sender_email, receiver_email, msg.as_string())
server.quit()