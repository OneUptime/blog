# Validation Summary: How to Run Homebridge in Docker for HomeKit

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Homebridge
- Homebridge Docker image
- Docker Compose
- Apple HomeKit
- Bonjour/mDNS and Avahi
- Homebridge UI
- Homebridge plugins, including TP-Link Smart Home and Camera FFmpeg

## Sources Consulted
- Homebridge Docker official README: https://github.com/homebridge/docker-homebridge
- Homebridge UI official README: https://github.com/homebridge/homebridge-config-ui-x
- Homebridge Child Bridges documentation: https://github.com/homebridge/homebridge/wiki/Child-Bridges
- Homebridge mDNS Options documentation: https://github.com/homebridge/homebridge/wiki/mDNS-Options
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose service reference: https://docs.docker.com/reference/compose-file/services/
- homebridge-tplink-smarthome README: https://github.com/plasticrake/homebridge-tplink-smarthome
- homebridge-camera-ffmpeg README: https://www.npmjs.com/package/homebridge-camera-ffmpeg
- Debian avahi-browse man page: https://manpages.debian.org/testing/avahi-utils/avahi-browse.1.en.html

## Issues Found
- The Docker Compose example used the legacy top-level `version: "3.8"` field. Docker's current Compose Specification is the recommended format, so the version line was removed.
- The Docker Compose example used old Homebridge UI environment variables. The current official Homebridge Docker image exposes the UI on port 8581 by default and documents `ENABLE_AVAHI=1` for container mDNS, so the environment block was updated.
- The TP-Link plugin example used `discoveryOptions` with `broadcast` and `discoveryInterval`, but the documented user configuration places `broadcast` and `pollingInterval` at the platform level. The snippet was corrected.
- The Camera FFmpeg example was shown as a bare platform object while the preceding text described editing the Homebridge config file. The snippet was wrapped in a `platforms` array so it can be pasted as a valid config shape.
- The child bridge section described child bridges as separate HomeKit accessories and said each child bridge gets its own pairing code. Official documentation describes them as separate bridges in isolated processes, with the PIN defaulting to the main bridge unless customized. The wording was corrected.

## Review Notes
- The `avahi-browse -a -t` troubleshooting command is syntactically valid, but the local review environment did not have `avahi-browse` installed, so this was verified against the Debian man page rather than local command output.
- The post correctly uses `homebridge/homebridge:latest`, host networking, persistent `/homebridge` storage, `docker compose up -d`, `docker compose logs -f`, and the Homebridge UI default `admin` / `admin` credentials.
