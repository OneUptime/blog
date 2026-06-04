# Validation Summary: How to Run FFmpeg in Docker for Video Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- FFmpeg
- ffprobe
- HLS streaming
- Shell scripting
- Dockerfiles

## Sources Consulted
- Docker Docs: Bind mounts, https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Compose Deploy Specification, https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Compose version top-level element, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Docker Official Images, https://docs.docker.com/docker-hub/repos/manage/trusted-content/official-images/
- FFmpeg documentation, https://ffmpeg.org/ffmpeg-all.html
- FFmpeg Formats documentation for HLS options, https://ffmpeg.org/ffmpeg-formats.html
- ffprobe documentation, https://ffmpeg.org/ffprobe.html
- John Van Sickle FFmpeg static builds, https://johnvansickle.com/ffmpeg/
- Docker Hub: linuxserver/ffmpeg, https://hub.docker.com/r/linuxserver/ffmpeg
- Docker Hub: jrottenberg/ffmpeg, https://hub.docker.com/r/jrottenberg/ffmpeg/

## Issues Found
- The post described linuxserver and jrottenberg images as "official" FFmpeg images. These are prebuilt/community images, not Docker Official Images, so the heading and description were changed to "prebuilt" images.
- Several `docker run -v $(pwd)/media:/media` examples left the bind mount unquoted. The commands were updated to quote the mount argument so paths containing spaces are handled correctly.
- The static-build Dockerfile claimed "all codecs" were included. This was changed to "many common codecs" because static builds include a configured set of libraries, not every possible codec.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. It was removed to match the current Compose Specification.
- The thumbnail-grid example said frames were sampled evenly across the video, but the filter samples every 300th frame. The comment was corrected.
- The HLS example claimed multiple quality levels/adaptive bitrate output, but the command creates a single HLS rendition. The description and comment were corrected, and `mkdir -p media/hls` was added so the segment output directory exists before FFmpeg writes files.

## Review Notes
- The FFmpeg and ffprobe options used in the examples are valid according to the current FFmpeg documentation.
- `jrottenberg/ffmpeg:4.4-ubuntu` is an older pinned FFmpeg image. Pinning is acceptable for reproducibility, but readers may want to choose a newer tag for current production use.
- Docker Hub returned an unauthenticated pull rate-limit while checking some manifests, so image availability was cross-checked through Docker Hub pages and search results rather than a full local manifest inspection for every tag.
