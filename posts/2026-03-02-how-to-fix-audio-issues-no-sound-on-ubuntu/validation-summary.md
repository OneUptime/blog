# Validation Summary: How to Fix Audio Issues (No Sound) on Ubuntu

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ubuntu
- ALSA
- PulseAudio
- PipeWire
- WirePlumber
- Bluetooth audio
- HDMI audio
- Linux kernel audio modules
- Firefox, VLC, and Steam/Proton audio configuration

## Sources Consulted
- Ubuntu Community Help Wiki: SoundTroubleshooting, https://help.ubuntu.com/community/SoundTroubleshooting
- Ubuntu Desktop blog: What's new in Ubuntu Desktop 22.10, Kinetic Kudu, https://ubuntu.com/blog/2022/10/21/whats-new-in-ubuntu-desktop-22-10-kinetic-kudu/
- Ubuntu manpage: pactl(1), https://manpages.ubuntu.com/manpages/noble/man1/pactl.1.html
- Ubuntu manpage: aplay(1), https://manpages.ubuntu.com/manpages/noble/man1/aplay.1.html
- Ubuntu manpage: amixer(1), https://manpages.ubuntu.com/manpages/noble/man1/amixer.1.html
- Ubuntu manpage: speaker-test(1), https://manpages.ubuntu.com/manpages/stonking/man1/speaker-test.1.html
- Ubuntu manpage: modprobe.d(5), https://manpages.ubuntu.com/manpages/kinetic/en/man5/modprobe.d.5.html
- Linux kernel documentation: HD-Audio Codec-Specific Models, https://docs.kernel.org/sound/hd-audio/models.html
- Local Ubuntu package metadata and command help for alsa-utils, kmod, PipeWire, WirePlumber, and PulseAudio-related utilities.

## Issues Found
- The raw ALSA test section only stopped PulseAudio even though it claimed to bypass PulseAudio/PipeWire. Added PipeWire user-service stop/start commands and made the PulseAudio/PipeWire restart commands tolerant of systems that only have one stack installed.
- The HDMI default-card modprobe example treated `snd-hda-intel` and `snd_hda_intel` as different module names. Corrected the example to use a single `snd-hda-intel` options line because hyphens and underscores are interchangeable in kernel module names.
- The PulseAudio suspended-sink wake-up example used `paplay /dev/null`, which is not a valid audio playback test file. Replaced it with `pactl suspend-sink @DEFAULT_SINK@ false`, matching the documented `pactl suspend-sink` command.
- The PipeWire section said "Ubuntu 22.04+ with PipeWire", which could imply Ubuntu 22.04 used PipeWire as the default audio system. Clarified that Ubuntu 22.10+ uses PipeWire by default, while Ubuntu 22.04 requires manual PipeWire configuration for this section to apply.

## Review Notes
The remaining commands are generally valid for Ubuntu systems, but several examples use placeholder device names, sink names, card IDs, and Bluetooth MAC-like identifiers that users must replace with values from their own system.
