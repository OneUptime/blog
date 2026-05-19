# Validation Summary: How to Install FFmpeg for Video/Audio Processing on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and usage guide

## Technologies Covered
- Ubuntu
- FFmpeg
- FFprobe
- Video and audio transcoding
- FFmpeg filters
- Hardware-accelerated encoding
- HLS and RTMP streaming
- Bash batch processing

## Sources Consulted
- FFmpeg documentation: https://www.ffmpeg.org/documentation.html
- FFmpeg command-line documentation: https://ffmpeg.org/ffmpeg.html
- FFmpeg codecs documentation: https://www.ffmpeg.org/ffmpeg-codecs.html
- FFmpeg filters documentation: https://www.ffmpeg.org/ffmpeg-filters.html
- Ubuntu Noble ffmpeg manpage: https://manpages.ubuntu.com/manpages/noble/man1/ffmpeg.1.html
- Ubuntu package details for ffmpeg: https://packages.ubuntu.com/noble/ffmpeg
- Launchpad PPA details for ppa:savoury1/ffmpeg4: https://launchpad.net/~savoury1/+archive/ubuntu/ffmpeg4
- Launchpad PPA details for ppa:mc3man/mpv-tests: https://launchpad.net/~mc3man/+archive/ubuntu/mpv-tests
- John Van Sickle FFmpeg static builds: https://www.johnvansickle.com/ffmpeg/
- Local FFmpeg CLI help output for encoders, filters, and muxers, including libx264, libaom-av1, h264_nvenc, h264_qsv, h264_vaapi, HLS, scale, pad, setpts, atempo, and loudnorm.

## Issues Found
- The PPA section described `ppa:savoury1/ffmpeg4` and `ppa:mc3man/mpv-tests` as generally newer and more complete. Current Launchpad details show `ppa:savoury1/ffmpeg4` is an FFmpeg 4.4.6 PPA, while Ubuntu 24.04 already packages FFmpeg 6.1.1, and `ppa:mc3man/mpv-tests` is primarily an mpv PPA with limited/current-release relevance. Changed the section to describe PPAs as alternative third-party builds whose support varies by Ubuntu release.
- The static build section said static builds include "almost all codecs." This is too broad because codec availability depends on the build configuration and licensing. Changed it to "many common codecs."
- The source-build dependency list omitted `pkg-config`, which FFmpeg's configure process commonly needs to discover installed external libraries such as x264, x265, libvpx, and libfdk-aac. Added `pkg-config`.
- The MKV-to-MP4 stream-copy example implied it always works. FFmpeg stream copy is valid but can fail when the copied streams are not compatible with the target container. Updated the comment to state that the streams must be MP4-compatible.
- The audio extraction example used `-c:a copy audio.aac` under a generic "Extract audio" comment. That command is correct for copying an AAC stream, but not for arbitrary input audio codecs. Updated the comment to specify AAC audio.
- The AMD AMF example only mentioned the AMD GPU driver. FFmpeg also needs to be built with AMF support for `h264_amf` to exist. Updated the comment accordingly.

## Review Notes
The remaining commands and options were consistent with FFmpeg documentation and local FFmpeg help output. Hardware encoder availability remains build- and hardware-dependent, so users should rely on the included `ffmpeg -encoders` check before using those examples.
