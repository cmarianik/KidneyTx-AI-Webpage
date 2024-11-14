import os
import sys
import zipfile

# This script zips up the desired files, which are the "..._final_overlay.png" images, and csv file
# It stores them in a file ending with "..._results.zip" in the folder it found the files in.

base_path = '/mnt/UserData1/mariac06/pathology_image_UNOS/'
file_arg = sys.argv[1]
file_dir_name = os.path.join(base_path, file_arg + '_newpipeline/ensemble_wsi')

# List files in the directory that end with desired suffixes
# os.walk() recursively goes through all subdirectories and files
file_paths = []
for root, dirs, files in os.walk(file_dir_name):
    for file in files:
        if file.endswith("_final_overlay.png") or file.endswith(".csv"):
            file_path = os.path.join(root, file)
            file_paths.append(file_path)

# Extract the directory path from the first file in the list
if file_paths:
    first_file_path = file_paths[0]
    zip_dir = os.path.dirname(first_file_path)

    # Create a temporary zip file in the same directory as the files
    zipfile_name = os.path.join(zip_dir, file_arg + '_results.zip')

    with zipfile.ZipFile(zipfile_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_path in file_paths:
            zipf.write(file_path, os.path.basename(file_path))
else:
    print("No files found to zip.")
