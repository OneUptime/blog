# Validation Summary: How to Set Up SRS (Simple Real-Time Server) on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- SRS (Simple Real-Time Server) v6.x
- RTMP, HLS, HTTP-FLV, SRT, WebRTC streaming protocols
- Ubuntu Linux (apt, systemd, ufw)
- FFmpeg (test stream generation, transcoding)
- Bash / shell
- SRS HTTP API
- SRS origin/edge cluster mode

## Sources Consulted
- SRS GitHub repository and release pages: https://github.com/ossrs/srs/releases
- SRS configure script and option parser (`trunk/auto/options.sh`) in the `develop` branch
- SRS official docs: https://ossrs.net/lts/en-us/docs/v6/doc/install
- Ubuntu apt-cache verification for `libst-dev` (State Threads Library) package availability

## Issues Found
- The binary download block referenced a non-existent SRS version (`6.0.50`) and the now-incorrect `.tar.gz` extension. SRS 6.x prebuilt binaries are published as `.zip` files with tags such as `v6.0-r0`, `v6.0-b3`, etc. Updated the example to `SRS_VERSION="6.0-r0"` and `.zip`, and clarified the comment to direct readers to check the GitHub releases page for the latest tag.

## Review Notes
- The `./configure` flags `--with-hls`, `--with-http-callback`, `--with-http-server`, `--with-http-api` are silently ignored by modern SRS (these features are permanently enabled and emit an "Ignore option" warning). They do not break the build, so the command remains functional. `--with-ssl`, `--with-ffmpeg`, and `--with-transcode` are still parsed (legacy `--with-*` format) and set their corresponding feature variables. Modern SRS prefers `--option=on|off` syntax (e.g., `--ffmpeg-fit=on`), but the post's form still works.
- `libst-dev` was verified to exist in Ubuntu's `universe/libdevel` repository (State Threads Library), though SRS bundles its own state-threads under `trunk/3rdparty` and does not strictly require the system package. Installing it is harmless.
- The SRS configuration syntax (`vhost __defaultVhost__`, `http_api`, `http_server`, `hls`, `http_remux`, `dvr`, `transcode`, `cluster`, `rtc_server`, `rtc`, `http_hooks`) and the HTTP API endpoints (`/api/v1/versions`, `/api/v1/streams`, `/api/v1/clients`, `/api/v1/summaries`) match SRS 6.x documentation.
- The systemd unit uses `Type=forking` with a `PIDFile`, which matches how the SRS launcher behaves by default — fine for most setups.
- HTTP-FLV being described as "low-latency browser playback" is true relative to HLS, but browsers don't natively decode FLV — a player like flv.js is required. This is a minor framing nuance, not an error, so the wording was left intact per the "only fix technical errors" instruction.
- WebRTC was introduced in SRS 4.x (beta) and made production-ready in 5.x; the post's phrasing "SRS 5.x and later include WebRTC support" is accurate for production-quality WebRTC.
