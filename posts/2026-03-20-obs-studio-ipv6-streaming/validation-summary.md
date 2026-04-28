# Validation Summary: How to Configure OBS Studio for IPv6 Streaming

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OBS Studio (Open Broadcaster Software)
- IPv6 networking
- RTMP (Real-Time Messaging Protocol)
- SRT (Secure Reliable Transport)
- FFmpeg / ffplay
- v4l2loopback (Linux virtual camera)
- obs-websocket / obs-cmd
- nginx-rtmp module
- CEF (Chromium Embedded Framework) browser source
- Linux networking utilities (ss, mtr, ip6tables)

## Sources Consulted
- OBS Studio documentation: https://obsproject.com/wiki/
- OBS Studio command-line options: https://obsproject.com/kb/launch-parameters
- obs-websocket protocol: https://github.com/obsproject/obs-websocket
- obs-cmd repository: https://github.com/grigio/obs-cmd
- RFC 3986 (URI bracket notation for IPv6): https://www.rfc-editor.org/rfc/rfc3986
- RFC 2732 (Format for Literal IPv6 Addresses in URLs): https://www.rfc-editor.org/rfc/rfc2732
- v4l2loopback documentation: https://github.com/umlaeute/v4l2loopback
- FFmpeg RTMP/SRT protocol documentation: https://ffmpeg.org/ffmpeg-protocols.html
- nginx-rtmp-module stat endpoint: https://github.com/arut/nginx-rtmp-module/wiki/Directives

## Issues Found
1. **Incorrect comment for OBS CLI command**: The comment "Start OBS in virtual camera mode (Linux)" did not match the actual flags `--startreplaybuffer --minimize-to-tray`, which start the replay buffer (not the virtual camera). To start the virtual camera, the flag is `--startvirtualcam`. Updated the comment to "Start OBS with replay buffer enabled (Linux)" to accurately describe what the command does.

2. **Outdated obs-websocket port**: The example used port `4444`, which is the legacy default for obs-websocket v4. Since OBS Studio 28 (released September 2022), obs-websocket v5 is built in and uses port `4455` by default. Updated the example port to `4455` to reflect the current default for any modern OBS installation.

## Review Notes
- The `obs-cmd` example is illustrative; the exact `config stream server` subcommand syntax depends on the specific obs-cmd version/fork in use, but the conceptual approach (using obs-websocket to dynamically change stream URLs) is valid via the OBS WebSocket `SetStreamServiceSettings` request.
- The bracket notation for IPv6 in RTMP/SRT URLs follows RFC 3986/2732 standards, which is what FFmpeg (used internally by OBS) and most network libraries expect. The post correctly applies this throughout.
- The `ffmpeg -i ... -f v4l2 /dev/video10` example may need an explicit `-pix_fmt yuv420p` flag for some v4l2loopback configurations, depending on the source format. Not a hard error since FFmpeg can negotiate compatible formats, but adding pix_fmt is more reliable in practice.
- SRT support has been available in OBS Studio since version 25 (via FFmpeg integration); the "OBS 27+ has native SRT support" wording is acceptable as later versions improved the integration, though SRT was usable earlier through custom FFmpeg output.
- The CEF browser source in OBS does support IPv6 URLs natively, as Chromium has full IPv6 support.
