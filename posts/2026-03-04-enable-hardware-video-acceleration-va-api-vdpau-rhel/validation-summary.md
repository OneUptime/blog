# Validation Summary: How to Enable Hardware Video Acceleration (VA-API/VDPAU) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- VA-API and libva
- VDPAU and libvdpau
- Intel, AMD, NVIDIA, nouveau, and Mesa video drivers
- GStreamer
- FFmpeg
- VLC
- Firefox

## Sources Consulted
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Red Hat Enterprise Linux 9 desktop migration notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_desktop_considerations-in-adopting-rhel-9
- Intel libva project documentation: https://github.com/intel/libva
- Intel libva-utils documentation for `vainfo`: https://github.com/intel/libva-utils
- Intel media-driver supported platforms: https://github.com/intel/media-driver
- Mesa platform and driver documentation: https://docs.mesa3d.org/systems.html
- GStreamer VA plugin documentation: https://gstreamer.freedesktop.org/documentation/va/
- GStreamer VA-API upstream project: https://gitlab.freedesktop.org/gstreamer/gstreamer-vaapi
- FFmpeg official documentation: https://ffmpeg.org/ffmpeg.html
- freedesktop.org VDPAU documentation: https://www.freedesktop.org/wiki/Software/VDPAU/
- NVIDIA VDPAU support documentation: https://download.nvidia.com/XFree86/Linux-x86_64/435.17/README/vdpausupport.html
- Mozilla Firefox performance settings documentation: https://support.mozilla.org/en-US/kb/performance-settings

## Issues Found
- The FFmpeg VA-API command used `-o output.mp4`. FFmpeg output files are positional arguments, and `-o` is not the correct output-file syntax. Changed the command to end with `output.mp4`.
- The FFmpeg VA-API example was labeled as decoding while using `h264_vaapi`, which is a VA-API encoder. Changed the comment to say "Transcode" and added `-hwaccel_output_format vaapi` so decoded frames remain in VA-API hardware frames for the VA-API encoder.
- The Intel `vainfo` note told readers to look for both H.264 and HEVC profiles. HEVC support depends on the GPU generation and driver, so the note now says to look for profiles matching codecs the GPU supports, such as H.264 or HEVC.

## Review Notes
Several package names in the post are available from RHEL, EPEL, RPM Fusion, or vendor repositories depending on the RHEL major version and enabled repositories. The commands are technically plausible, but a future revision could add a short repository-prerequisite note for RHEL systems that do not have EPEL, RPM Fusion, or NVIDIA vendor repositories enabled.
