# How to Install and Enable Multimedia Codecs for Video Playback on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Multimedia, Codecs, Video Playback, GStreamer, Linux

Description: Install multimedia codecs on RHEL to enable playback of common video and audio formats including H.264, H.265, AAC, and MP3.

---

RHEL's default installation does not include proprietary multimedia codecs due to licensing restrictions. To play common video formats (MP4, MKV, AVI) and audio formats (MP3, AAC), you need to install additional codec packages from supplementary repositories.

## Enable Required Repositories

```bash
# Enable the CodeReady Builder repository (provides additional dependencies)
sudo subscription-manager repos --enable=codeready-builder-for-rhel-9-x86_64-rpms

# Install EPEL for additional packages
sudo dnf install -y epel-release

# Install RPM Fusion repositories for multimedia codecs
sudo dnf install -y --nogpgcheck \
  https://mirrors.rpmfusion.org/free/el/rpmfusion-free-release-9.noarch.rpm \
  https://mirrors.rpmfusion.org/nonfree/el/rpmfusion-nonfree-release-9.noarch.rpm
```

## Install GStreamer Codecs

GStreamer is the multimedia framework used by GNOME applications.

```bash
# Install GStreamer base and good plugins (open codecs)
sudo dnf install -y gstreamer1-plugins-base gstreamer1-plugins-good

# Install GStreamer bad plugins (additional codecs with potential patent issues)
sudo dnf install -y gstreamer1-plugins-bad-free

# Install GStreamer ugly plugins (codecs with known patent issues)
sudo dnf install -y gstreamer1-plugins-ugly

# Install the libav/ffmpeg GStreamer plugin for broad codec support
sudo dnf install -y gstreamer1-plugin-libav
```

## Install FFmpeg

```bash
# Install FFmpeg for command-line multimedia processing
sudo dnf install -y ffmpeg ffmpeg-libs

# Verify the installation
ffmpeg -version

# List supported codecs
ffmpeg -codecs | head -30
```

## Install VLC Media Player

VLC comes with its own codec library and plays nearly everything.

```bash
# Install VLC from RPM Fusion
sudo dnf install -y vlc

# Or install VLC as a Flatpak (sandboxed, includes all codecs)
flatpak install -y flathub org.videolan.VLC
```

## Verify Codec Support

```bash
# Check which GStreamer plugins are installed
gst-inspect-1.0 | grep -E "h264|h265|aac|mp3|vorbis"

# Test video playback from the command line
# Play an MP4 file with the GStreamer test player
gst-play-1.0 /path/to/video.mp4

# Or use FFplay (part of FFmpeg)
ffplay /path/to/video.mp4
```

## Install Codec Support for Firefox

Firefox on RHEL needs OpenH264 for H.264 video in web browsers.

```bash
# Install OpenH264 from Cisco's repository (free for use)
sudo dnf install -y openh264 mozilla-openh264

# Enable the OpenH264 plugin in Firefox:
# Open Firefox > Menu > Add-ons > Plugins
# Enable "OpenH264 Video Codec provided by Cisco Systems"
```

## Play DVDs (Optional)

```bash
# Install DVD playback support
sudo dnf install -y libdvdcss libdvdread libdvdnav

# Test DVD playback
vlc /dev/sr0
```

## Troubleshooting

```bash
# If a video file does not play, check which codec it needs
ffprobe /path/to/video.mp4

# Check for missing GStreamer plugins
gst-inspect-1.0 --print-all 2>&1 | grep "No such element"

# Clear the GStreamer registry cache
rm -rf ~/.cache/gstreamer-1.0/

# Test audio playback
paplay /usr/share/sounds/freedesktop/stereo/bell.oga
```

After installing these codecs, GNOME Videos (Totem), Firefox, and other media applications on RHEL can play most common audio and video formats.
