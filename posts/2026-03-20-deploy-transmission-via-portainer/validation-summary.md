# Validation Summary: How to Deploy Transmission via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Transmission
- Portainer
- Docker
- Docker Compose
- JSON-RPC
- `curl`
- OneUptime

## Sources Consulted
- LinuxServer.io Transmission image docs: https://docs.linuxserver.io/images/docker-transmission/
- LinuxServer Transmission default settings: https://raw.githubusercontent.com/linuxserver/docker-transmission/master/root/defaults/settings.json
- LinuxServer Transmission init script: https://raw.githubusercontent.com/linuxserver/docker-transmission/master/root/etc/s6-overlay/s6-rc.d/init-transmission-config/run
- Transmission RPC specification: https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md
- Transmission configuration reference: https://github.com/transmission/transmission/blob/main/docs/Editing-Configuration-Files.md
- Transmission remote/web help: https://github.com/transmission/transmission/blob/main/macosx/TransmissionHelp/html/remote.html
- Transmission web UI source, preferences dialog: https://github.com/transmission/transmission/blob/main/web/src/prefs-dialog.js
- Transmission web UI source, action manager: https://github.com/transmission/transmission/blob/main/web/src/action-manager.js
- Transmission RPC server auth handling: https://github.com/transmission/transmission/blob/main/libtransmission/rpc-server.cc
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Compose example used the older `linuxserver/transmission:latest` image reference. LinuxServer's current official documentation uses `lscr.io/linuxserver/transmission:latest`, so I updated the image name.
- The Compose example included the top-level `version: "3.8"` key. Current Docker Compose documentation marks the `version` field as obsolete, so I removed it.
- The post told readers to open `http://<host>:9091` after deployment. Transmission's documented web interface path is `http://<host>:9091/transmission/web/`, so I updated the URL to the exact upstream path.
- The speed-limit instructions used a desktop-style path, `Edit > Preferences > Speed`, and referred to `Scheduled Hours`. The current Transmission web client exposes this through `Edit preferences` and labels the scheduler control `Scheduled times`, so I updated the wording to match the web UI used in the post.
- The RPC example used Transmission's older deprecated RPC shape (`torrent-add`, `arguments`) and extracted the session token from the response body with `grep -oP`. Transmission 4.1's current RPC spec uses JSON-RPC 2.0 with snake_case method names, and the session token is returned in the `X-Transmission-Session-Id` response header on a `409` response. I replaced the example with a header-based session lookup and a current `torrent_add` JSON-RPC request.
- The monitoring section implied a plain HTTP check would return `200` even when `USER` and `PASS` are enabled. In the LinuxServer image, setting those variables enables Transmission RPC authentication, and Transmission returns `401` for unauthenticated requests, so I updated the post to note that the monitor must send HTTP Basic auth when credentials are enabled.

## Review Notes
- LinuxServer's current default `settings.json` enables `watch-dir-enabled` and maps the watch directory to `/watch`, so the post's claim that dropping `.torrent` files there auto-adds them is correct for this image.
- LinuxServer's current default download target is `/downloads/complete`, so with the post's bind mount the downloaded files land under the host path's `complete/` subdirectory.
- Docker was not installed in this workspace, so I verified the Compose fields against official documentation and upstream image behavior rather than running `docker compose config`.
