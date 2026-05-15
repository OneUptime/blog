# Validation Summary: How to Install and Enable Multimedia Codecs for Video Playback on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF and subscription-manager
- EPEL
- RPM Fusion
- GStreamer
- FFmpeg
- VLC
- Firefox OpenH264
- DVD playback libraries

## Sources Consulted
- Red Hat documentation: Managing software with the DNF tool - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat documentation: Installing applications using Flatpak - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/administering_the_system_using_the_gnome_desktop_environment/assembly_installing-applications-using-flatpak_administering-the-system-using-the-gnome-desktop-environment
- EPEL documentation: Getting started with EPEL - https://docs.fedoraproject.org/en-US/epel/getting-started/
- Red Hat Blog: How to install EPEL on RHEL and CentOS Stream - https://www.redhat.com/en/blog/install-epel-linux
- RPM Fusion EL 9 package indexes - https://download1.rpmfusion.org/free/el/updates/9/x86_64/repoview/
- RPM Fusion free tainted EL 9 libdvdcss listing - https://download1.rpmfusion.org/free/el/tainted/9/x86_64/l/
- GStreamer tools documentation: gst-inspect-1.0 - https://gstreamer.freedesktop.org/documentation/tools/gst-inspect.html
- FFmpeg documentation - https://ffmpeg.org/ffmpeg.html
- Mozilla Support: Why is there an OpenH264 plugin in Firefox? - https://support.mozilla.org/en-US/kb/open-h264-plugin-firefox
- Fedora Packages: epel-release for EPEL 9 - https://packages.fedoraproject.org/pkgs/epel-release/epel-release/epel-9.html

## Issues Found
- The CRB command hardcoded `x86_64`, which makes the guide less correct for other RHEL 9 architectures. Changed it to `codeready-builder-for-rhel-9-$(arch)-rpms`, matching EPEL and Red Hat guidance.
- The EPEL install command used `dnf install epel-release`, which is not reliable on a fresh RHEL system before EPEL is configured. Changed it to install the official EPEL 9 release RPM URL.
- The GStreamer codec list installed only `gstreamer1-plugins-bad-free`; RPM Fusion's EL 9 package indexes show `gstreamer1-plugins-bad-freeworld` as the relevant additional freeworld codec package. Added it alongside `gstreamer1-plugins-bad-free`.
- The Firefox section implied OpenH264 enables general H.264 web video playback. Mozilla documents that Firefox relies on the operating system for general H.264 playback and uses OpenH264 for WebRTC when needed. Updated the explanation while keeping the OpenH264 installation command.
- The DVD section installed `libdvdcss` without enabling RPM Fusion's free tainted repository, where `libdvdcss` is provided for EL 9. Added `rpmfusion-free-release-tainted` before installing DVD libraries.

## Review Notes
The guide is RHEL 9-specific because the repository IDs and RPM Fusion release packages target EL 9. The RPM Fusion and EPEL steps use third-party repositories that are outside Red Hat production support, so future edits could add a support caveat, but the existing commands are technically valid for the tutorial's goal.
