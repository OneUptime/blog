# Validation Summary: How to Install and Configure OvenMediaEngine on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- OvenMediaEngine (OME) — open-source streaming server
- Ubuntu (18.04+)
- Docker
- WebRTC (signaling, ICE, STUN, TURN/TCP relay)
- RTMP
- SRT
- LLHLS (Low-Latency HLS)
- FFmpeg (test stream generation)
- OvenPlayer (reference web player)
- UFW (firewall)
- Let's Encrypt / Certbot (TLS)
- systemd

## Sources Consulted
- [OvenMediaEngine official documentation — Getting Started](https://docs.ovenmediaengine.com/getting-started)
- [OvenMediaEngine official documentation — Configuration](https://docs.ovenmediaengine.com/configuration)
- [OvenMediaEngine Server.xml example on GitHub](https://github.com/AirenSoft/OvenMediaEngine/blob/master/misc/conf_examples/Server.xml)
- [AirenSoft/OvenMediaEngine GitHub repository](https://github.com/AirenSoft/OvenMediaEngine)

## Issues Found

1. **Nonexistent apt repository at `pkg.airensoft.com`.** The post recommended adding `https://pkg.airensoft.com/debian stable main` as an apt source and installing via `sudo apt install ovenmediaengine`. No such repository exists — the official documentation only distributes OME via the `airensoft/ovenmediaengine` Docker image and source compilation. Replaced this entire section with the documented Docker installation flow (`docker pull airensoft/ovenmediaengine:latest` + the official `docker run` command with the correct port mappings and `OME_HOST_IP` env var).

2. **Fabricated pre-built GitHub release tarball.** The post fetched `ovenmediaengine-${VERSION}-ubuntu2004.tar.gz` from GitHub Releases, but OME does not publish pre-built Ubuntu binaries there — only source code. Replaced with the actual build-from-source procedure: `git clone`, `misc/prerequisites.sh`, `make release`, `sudo make install`.

3. **Wrong `IceCandidate` format.** The post used `YOUR_PUBLIC_IP/udp:10006-10010`. Per the OME docs, the correct format is `IP:port-range/protocol`, so this had to become `YOUR_PUBLIC_IP:10006-10010/udp`. Also added a `<TcpRelay>` entry, which is part of the standard ICE candidates block.

4. **Wrong `<IP>` bind value.** The post used `0.0.0.0`. The documented wildcard value is `*` (which also enables both IPv4 and the typical OME bind semantics). Changed `<IP>0.0.0.0</IP>` → `<IP>*</IP>` and added the standard `<Type>origin</Type>` and `<StunServer>` elements that appear in the official example `Server.xml`.

5. **Plain `<HLS>` publisher and port conflict.** The post declared both `<HLS><Port>8080</Port></HLS>` and `<LLHLS><Port>8080</Port></LLHLS>` in the same `<Bind>` block, which would fail to start (two publishers cannot bind the same TCP port). Additionally, current OME (v8 schema, 0.18+) ships LLHLS as the HTTP delivery protocol, sharing ports 3333/3334 with WebRTC signaling — there is no standalone `<HLS>` `<Port>` element in the default example. Removed the redundant `<HLS>` bind block and consolidated on the documented LLHLS configuration (`<Port>3333</Port>`, `<TLSPort>3334</TLSPort>`).

6. **Application-level `<HLS>` publisher removed.** Mirrored the above: removed the application-level `<HLS>` publisher that referenced `PlaylistLength` (not a valid field name) and tightened the `<LLHLS>` block to use the documented `ChunkDuration`, `SegmentDuration`, and `SegmentCount` fields.

7. **Wrong playback URL and port for the HLS fallback.** The post pointed users at `http://.../app/test/playlist.m3u8` on port 8080. With the corrected config, the OME LLHLS endpoint is `http://YOUR_SERVER_IP:3333/app/test/llhls.m3u8`.

8. **Service management aligned with the chosen install path.** The original `systemctl start ovenmediaengine` block assumes the apt package's unit file. Reworked to show `docker restart`/`docker logs` for the Docker path, and kept the systemd commands for the from-source path where the unit is actually installed by `make install`.

9. **Firewall ports updated** to reflect the corrected bind set: opened 3334/tcp (TLS), 3478/tcp (TURN/TCP relay), and removed the now-unused 80/443/8080 allowances.

10. **System Requirements bullets updated** to list the actual default ports OME uses (3333, 3334, 3478, 10006-10010/udp), and broadened the Ubuntu version constraint to "18.04 or later" in line with the official docs.

## Review Notes

- The Docker image namespace was confirmed as `airensoft/ovenmediaengine` per the official docs. A `ovenmedialabs/ovenmediaengine` namespace also appears in some GitHub README content; both have been published historically, but `airensoft/...` is the canonical one referenced by docs.ovenmediaengine.com.
- The `Server` schema `version="8"` was preserved — that is correct for current OME releases (0.18+).
- The OvenPlayer CDN URL (`cdn.jsdelivr.net/npm/ovenplayer/dist/ovenplayer.js`) and the WebRTC signaling URL format (`ws://server:3333/app/streamname`) were verified against the OvenPlayer/OME documentation and left unchanged.
- The FFmpeg test command, transcoding `<OutputProfiles>` snippet, and Certbot commands are syntactically correct and were not modified.
- The post still references HLS in a few places where LLHLS would be more accurate (e.g., the closing paragraph, troubleshooting heading "WebRTC playback fails but HLS works"). These are colloquially fine since LLHLS is HLS-derived, so I left them as-is per the "minimal changes" guidance.
- One nit not changed: the FFmpeg `testsrc` + `sine` inputs aren't mapped explicitly with `-map`. FFmpeg's default mapping will pick one video and one audio stream so the command works in practice, but an explicit `-map 0:v -map 1:a` would make intent clearer. Out of scope for technical-correctness fixes.
