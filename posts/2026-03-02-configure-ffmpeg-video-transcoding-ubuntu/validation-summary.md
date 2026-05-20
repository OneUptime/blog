# Validation Summary: How to Configure FFmpeg for Video Transcoding on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- FFmpeg
- FFprobe
- H.264, H.265/HEVC, VP9, Opus, AAC
- libx264
- NVIDIA NVENC
- Intel Quick Sync Video
- VAAPI
- Bash scripting

## Sources Consulted
- FFmpeg official documentation: https://www.ffmpeg.org/ffmpeg.html
- FFmpeg filters documentation: https://ffmpeg.org/ffmpeg-filters.html
- FFmpeg codecs documentation: https://ffmpeg.org/ffmpeg-codecs.html
- Ubuntu package details for ffmpeg: https://packages.ubuntu.com/noble/ffmpeg
- Launchpad page for ppa:jonathonf/ffmpeg-4: https://launchpad.net/~jonathonf/+archive/ubuntu/ffmpeg-4
- Local FFmpeg 6.1.1 help output for `libx264`, `h264_nvenc`, `h264_qsv`, `h264_vaapi`, `-progress`, `-crf`, `-global_quality`, and scale filter options

## Issues Found
- The post recommended `ppa:jonathonf/ffmpeg-4` as a source for latest FFmpeg features. That PPA is an old FFmpeg 4 backport listed for older Ubuntu releases, not a current source for supported Ubuntu LTS releases. Replaced the PPA command block with guidance to use a current static build or source build, and to verify third-party PPA support before use.
- Several shell examples placed comments after a trailing line-continuation backslash. In Bash, the backslash must terminate the line to continue the command, so those examples would execute incorrectly. Moved the explanatory text outside the command blocks and kept the commands syntactically valid.
- The 1280x720 scaling example claimed to preserve aspect ratio while using `scale=1280:720`, which forces exact dimensions and can distort video. Updated it to use `force_original_aspect_ratio=decrease`.
- The width-only scaling example used `scale=1280:-1`, which can produce an odd height and fail with common H.264 pixel formats. Updated it to `scale=1280:-2` so FFmpeg computes a height divisible by 2.
- The bitrate ladder examples used exact scale dimensions, which can distort non-16:9 inputs. Updated them to use `force_original_aspect_ratio=decrease`.

## Review Notes
The remaining commands and options are consistent with FFmpeg documentation and local FFmpeg 6.1.1 help output. Hardware acceleration commands still depend on GPU, driver, and FFmpeg build support, which the post already frames as hardware-dependent.
