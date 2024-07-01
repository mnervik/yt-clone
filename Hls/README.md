# HLS

This is a script for building a docker image, to generate HLS-files for the project.

## Requirements

1. Mount a video-directory containing all files to `app/videos`

## Running the Container

Build the dockerfile by running

```bash
docker build . -t hls
```

Run the dockerfile by running

```bash
docker run -it hls -v YOUR_VIDEOS_DIR:/app/videos
```

The image will look for mp4-files with a missing directory, and start generating the required files. If the script is stopped at some point, it will restart at the correct point the next time the container is started. After all files have been processed, the container will stop itself.

## About Bitrates

The script only handles resolutions up to 1080p, if a video above that is found, it will only generate files up to 1080p.
