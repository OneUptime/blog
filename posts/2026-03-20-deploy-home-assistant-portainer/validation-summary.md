# Validation Summary: How to Deploy Home Assistant via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Home Assistant (Docker Container image)
- Portainer (Stacks deployment UI)
- Docker / Docker Compose
- Linux host networking (`network_mode: host`)
- mDNS / SSDP / DHCP discovery
- D-Bus (Bluetooth integration)
- USB serial device passthrough (Zigbee / Z-Wave sticks via `/dev/ttyUSB*`, `/dev/ttyACM*`)
- Home Assistant REST API (port 8123, `/api/` endpoint, Long-Lived Access Tokens)
- OneUptime HTTP monitoring

## Sources Consulted
- Home Assistant Container installation docs: https://www.home-assistant.io/installation/linux
- Home Assistant REST API reference: https://developers.home-assistant.io/docs/api/rest/
- Home Assistant authentication / Long-Lived Access Tokens documentation
- Home Assistant Docker image on GHCR: `ghcr.io/home-assistant/home-assistant`
- Docker Compose specification (services, volumes, devices, network_mode)

## Issues Found
1. **`/api/` endpoint authentication requirement was not mentioned.** The original post stated that pointing an HTTP monitor at `http://<host>:8123/api/` would return `{"message": "API running."}` on a healthy install. In current Home Assistant versions, every endpoint under `/api/` requires authentication via `Authorization: Bearer <token>`; without a token the endpoint returns `401 Unauthorized` and never emits the documented response body. Updated the Monitoring section to instruct readers to create a Long-Lived Access Token from their user profile and send it as a Bearer token on the monitor request, which is the correct way to obtain the `{"message": "API running."}` response.

## Review Notes
- The Compose stack image (`ghcr.io/home-assistant/home-assistant:stable`), `network_mode: host`, `privileged: true`, the `/run/dbus` mount for Bluetooth, the default port `8123`, and the `/dev/ttyUSB0` device passthrough syntax all match the official Home Assistant Container documentation.
- The `version: "3.8"` Compose key is harmless but obsolete — modern Docker Compose ignores the top-level `version` field. Not technically wrong; left as-is to preserve author intent.
- The post correctly notes that `network_mode: host` is Linux-only; on Docker Desktop for Mac/Windows host networking does not behave the same way, and device discovery via mDNS/SSDP would need a different approach there.
- `privileged: true` is broader than strictly necessary if only USB devices are needed (a `devices:` mapping plus appropriate group access would suffice), but it matches the official Home Assistant docs' recommendation, so it was left unchanged.
- The example version tag `2024.3` in the Updating section is illustrative; readers should pick a current Home Assistant calendar-versioned tag at deploy time.
