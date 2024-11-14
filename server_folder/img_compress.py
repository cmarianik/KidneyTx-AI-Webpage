import os
import sys
from PIL import Image
import logging
Image.MAX_IMAGE_PIXELS = None  # Disable the decompression bomb warning

"""
    Converts images from the input directory to JPEG format and resizes them.

    Args:
        input_dir (str): Directory to search for images.
        output_dir (str): Directory to save the converted images.
        suffix (str): File suffix to filter images for conversion (default is '_final_overlay.png').
        output_format (str): Format to save the converted images (default is 'JPEG').
        quality (int): Quality of the output image for JPEG (default is 50).
        size (tuple): Resize dimensions for the output image (default is 300x300).
"""
def convert_images(input_dir, output_dir, suffix="_final_overlay.png", output_format="JPEG", quality=50, size=(300, 300)):
    # Set up logging with an absolute path for the log file
    log_filename = "/work/pathology_image_UNOS/compress.log"
    logging.basicConfig(filename=log_filename, level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    # Create the output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Loop through all files and subdirectories in the input directory
    logging.info("Processing images...")
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            if file.endswith(suffix):
                input_path = os.path.join(root, file)
                output_path = os.path.join(output_dir, os.path.relpath(input_path, input_dir))
                logging.info("Converting {} to {}".format(input_path, output_path))
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                try:
                    # Convert the image to JPEG and resize
                    image = Image.open(input_path)
                    image = image.convert("RGB")  # Ensure conversion to RGB before saving as JPEG
                    # Removing the resizing.
                    # image.thumbnail(size)
                    image.save(output_path.replace(".png", ".jpeg"), format=output_format, quality=quality)
                    logging.info("Conversion successful: {}".format(output_path))
                except Exception as e:
                    # Log the exception and continue processing other images
                    logging.error("Error processing {}: {}".format(input_path, e))


# Note: Due to python version incompatibility, Pillow is only accessible from inside the docker container
#       Therefore, the base path originates from /work/pathology_image_UNOS
if __name__ == "__main__":
    base_path = '/work/pathology_image_UNOS'
    file_arg = sys.argv[1]
    in_file_dir_name = os.path.join(base_path, file_arg + '_newpipeline/ensemble_wsi')
    out_directory = os.path.join(base_path, 'wsi_data', file_arg)

    convert_images(in_file_dir_name, out_directory)