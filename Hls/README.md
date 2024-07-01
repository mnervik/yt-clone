# HLS

This is a script for building a docker image, to generate HLS-files for the project.

## Requirements

1. Mount a video-directory containing all files to `app/media`

## Running the Container

Build the dockerfile by running

```bash
docker build . -t hls
```

Run the dockerfile by running

```bash
docker run -it hls -v YOUR_VIDEOS_DIR:/app/media
```

The image will look for mp4-files with a missing directory, and start generating the required files. If the script is stopped at some point, it will restart at the correct point the next time the container is started. After all files have been processed, the container will stop itself.
