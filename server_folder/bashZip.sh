#!/bin/bash

# This script automates the process of zipping files, updating the database, compressing images,
# cleaning up associated files, and sending an email notification after a pipeline finishes.

# Parameters:
# $1: userid (firebase id to identify user and their files)
# $2: emailid (email address to send results)
# $3: jobid (job name used for database updates)

userid="$1"
emailid="$2"
jobid="$3"

# Checking if both userid and emailid are provided
if [ -z "$userid" ] || [ -z "$emailid" ]; then
    echo "Usage: $0 <userid> <emailid>"
    exit 1
fi

echo "Pipeline has finished, zipping files."
python result_zipping.py "$userid"


# Updating the Database and generating html report.
echo "Updating the database with newfound data, and generating report"
node dbUpdate.js "$userid" "$jobid"


# Compressing images associated with userid.
echo "Also compressing images: docker exec -u 1007 -w /work/pathology_image_UNOS/ -d acaafc3cb5d9 python ./scripts/img_compress.py $userid"
docker exec -u 1007 -w /work/pathology_image_UNOS/ -d acaafc3cb5d9 python ./scripts/img_compress.py "$userid" &

# Wait for background processes to finish
wait

echo "Cleaning up files from "$userid"_newpipeline and associated .txts."
node fileCleanup "$userid"

# Sending email containing the html report.
echo "Sending email notification..."
python basic_email_results.py "$emailid" "$userid" "$jobid"
echo "Email sent"

