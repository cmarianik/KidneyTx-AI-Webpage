import os
import sys
import json
import csv

# This script receives user input from the frontend and stores it in a file ending in "_clinical.txt".
# This file is a csv file used as clinical data input for the database/results data.

json_argument = sys.argv[1]
# Parse the JSON string into a Python data structure
entry_list = json.loads(json_argument)
output_directory = '/mnt/UserData1/mariac06/pathology_image_UNOS/'  # Replace with the actual path
content = [["File", "KDPI", "Induction", "Recipient Ag", "PUMP_KI", "CIT(hours)"]]  # Header row

# Iterate over entry_list, assuming it has a dictionary structure.
for entry in entry_list:
    user_id = entry.get('user_id', 'N/A')
    subKDPI = entry.get('subKDPI', 'N/A')
    coldIsc = entry.get('coldIsc', 'N/A')
    recAge = entry.get('recAge', 'N/A')
    pumped = entry.get('pumped', 'N/A')
    induction = entry.get('induction', 'N/A')
    file_id = entry.get('file_id', 'N/A')
    job_id = entry.get('job_id', 'N/A')

    # Removing the file extension from the file ID for further processing
    newId = file_id.rsplit('.', 1)[0]

    # Append new row to contest list
    content.append([newId, subKDPI, induction, recAge, pumped, coldIsc])

# Setup file and output directory
file_id_base = os.path.basename(file_id)
file_id_base_without_ext, file_id_ext = os.path.splitext(file_id_base)
output_file_name = "{}_{}_clinical.txt".format(user_id, job_id)
output_file_path = os.path.join(output_directory, output_file_name)

# Write the content to the '..._clinical.txt' file using csv.writer
with open(output_file_path, 'w') as file:
    csv_writer = csv.writer(file, delimiter='\t')
    csv_writer.writerows(content)