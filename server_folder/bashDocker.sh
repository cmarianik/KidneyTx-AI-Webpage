#!/bin/bash

# This script initializes a Docker container and runs the machine learning pipeline inside it. 
# It sets up necessary directories, parameters, and files based on user inputs.
# The pipeline involves processing slide images to detect kidney abnormalities/viability

# PARAMETERS: 
#   $1: userid (used to identify the user and their related data)
#   $2: fileID (unique identifier for the file being processed)
#   $3: filetype (type of file being processed, e.g., .ndpi)
#   $4: skipyn (indicates whether fibrosis detection should be ran.)
userid="$1"
fileID="$2"
filetype="$3"
skipyn="$4"

# Setting up paths/file name for pipeline.
input_dir="../wsi_data/$userid"
output_file="$userid"_"$fileID"_"$filetype"_"$skipyn""_newtest.txt"
output_dir="$userid""_newpipeline"
file_suffix="$filetype"

# TODO: Enable multiprocessing using gp/cp/jp parameters.
docker start <redacted>
echo "docker exec -u 1007 -w /work/pathology_image_UNOS/ -d <redacted> python ./scripts/cleaned/UNOS_whole_slide_prediction_pipeline5_clean.py -dr "$input_dir" -df "$output_file" -wd "$output_dir" -gp 0 2 -cp 3 -jp 3 -gmp "glo_detect" -amp "artery_detect" -tup "tub_segm" -tump "tub_detect" -op "ensemble_wsi" -fs 1536 1536 -gmfs 5120 5120 -amfs 5120 5120 -tumfs 1536 1536 -tuis 1536 -tumst 0.1 -pw 5 -gpw 10 -apw 10 -tumpw 10 -tupw 10 -wf "$file_suffix" -ski "$skipyn" &"
docker exec -u 1007 -w /work/pathology_image_UNOS/ -d <redacted> python ./scripts/cleaned/UNOS_whole_slide_prediction_pipeline5_clean.py -dr "$input_dir" -df "$output_file" -wd "$output_dir" -gp 0 2 -cp 3 -jp 3 -gmp "glo_detect" -amp "artery_detect" -tup "tub_segm" -tump "tub_detect" -op "ensemble_wsi" -fs 1536 1536 -gmfs 5120 5120 -amfs 5120 5120 -tumfs 1536 1536 -tuis 1536 -tumst 0.1 -pw 5 -gpw 10 -apw 10 -tumpw 10 -tupw 10 -wf "$file_suffix" -ski "$skipyn" &