import os
import sys
import json
import csv

# This script receives user input from the frontend and stores it in a file ending in "_newtest.txt".
# This file is a csv file used as image data input for the machine learning pipeline.

json_argument = sys.argv[1]
# Parse the JSON string into a Python data structure
entry_list = json.loads(json_argument.decode('utf-8'))
output_directory = '/mnt/UserData1/mariac06/pathology_image_UNOS/'  # Replace with the actual path
content = [["File", "Include", "Set", "Wedge"]]  # Header row

# Future requirements may adjust these parameters.
include_arg = 'y'
set_arg = 'test'

# Iterate over entry_list, assuming it has a dictionary structure.
for entry in entry_list:
    user_id = entry.get('user_id', 'N/A')
    subKDPI = entry.get('subKDPI', 'N/A')
    subWSI = entry.get('subWSI', 'N/A')
    scanned = entry.get('scanned', 'N/A')
    imgF = entry.get('imgF', 'N/A')
    imgP = entry.get('imgP', 'N/A')
    wedgeSlide = entry.get('wedgeSlide', 'N/A')
    file_id = entry.get('file_id', 'N/A')

    # Removing the file extension from the file ID for further processing
    newId = file_id.rsplit('.', 1)[0]
    
    # Append new row to contest list
    content.append([newId, include_arg, set_arg, wedgeSlide])

# Setup file and output directory
file_id_base = os.path.basename(file_id)
file_id_base_without_ext, file_id_ext = os.path.splitext(file_id_base)
output_file_name = "{}_{}_newtest.txt".format(user_id, file_id_base_without_ext)
output_file_path = os.path.join(output_directory, output_file_name)

# Write the content to the '..._newtest.txt' file using csv.writer
with open(output_file_path, 'w') as file:
    csv_writer = csv.writer(file, delimiter='\t')
    csv_writer.writerows(content)