#!/bin/bash

# This script deletes ongoing jobs associated with a specific user, based on the userid.
# It removes the ongoing job folder, and kills all user-associated processes.

folderPath="/mnt/UserData1/mariac06/pathology_image_UNOS"
userid="$1"

# Ensure the folder path is correct and exists
if [ ! -d "$folderPath" ]; then
  echo "Error: Directory $folderPath does not exist."
  exit 1
fi

# Navigate to the target folder path
cd "$folderPath" || exit 1

# Find and delete files starting with the userid
# -type f: Selects only regular files (not directories)
# -maxdepth 1: Limits the search to the current directory (no subdirectories)
# -name "$userid*": Matches files starting with the userid
find . -maxdepth 1 -type f -name "${userid}*" -exec rm -f {} +

echo "Files starting with '$userid' deleted successfully in $folderPath."
# Delete the directory "${userid}_newpipeline" if it exists
if [ -d "${userid}_newpipeline" ]; then
  echo "Deleting directory ${userid}_newpipeline..."
  rm -rf "${userid}_newpipeline"
fi

search_argument="../wsi_data/$userid"
# Find the PIDs of the processes with the specific argument
pids=$(ps -ef | grep '[p]ython' | grep -- "-dr $search_argument" | awk '{print $2}')
echo "Found the following PIDs to kill:"
echo "$pids"
echo "Killing jobs:"
echo "$pids" | xargs kill -9