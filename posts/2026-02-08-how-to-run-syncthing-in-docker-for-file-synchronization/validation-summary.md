# Validation Summary: How to Run Syncthing in Docker for File Synchronization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Syncthing
- Syncthing REST API
- Syncthing ignore patterns
- Syncthing file versioning
- Syncthing folder types
- SSH tunneling

## Sources Consulted
- Syncthing Docker README: https://github.com/syncthing/syncthing/blob/main/README-Docker.md
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Syncthing Firewall Setup: https://docs.syncthing.net/users/firewall.html
- Syncthing File Versioning: https://docs.syncthing.net/users/versioning.html
- Syncthing Ignoring Files: https://docs.syncthing.net/users/ignoring.html
- Syncthing Folder Types: https://docs.syncthing.net/users/foldertypes.html
- Syncthing REST API overview: https://docs.syncthing.net/dev/rest.html
- Syncthing GET /rest/db/completion: https://docs.syncthing.net/rest/db-completion-get.html
- Syncthing GET /rest/system/connections: https://docs.syncthing.net/rest/system-connections-get.html

## Issues Found
- The Docker Compose example used bridge networking with explicit port mappings. The official Syncthing Docker README strongly recommends host networking because Docker's default network mode prevents local IP addresses from being discovered correctly and can degrade LAN connections. Changed the Compose example to use `network_mode: host`.
- The Docker Compose example used the obsolete top-level `version` key. Removed it so the example follows the current Compose Specification behavior.
- After switching to host networking, the Web UI still needed to be reachable as described by the post. Added `STGUIADDRESS=0.0.0.0:8384`, which matches the official Docker image behavior for externally reachable GUI access. The post already instructs readers to configure authentication and optionally HTTPS.
- The file versioning example was labeled as YAML even though it contains XML, and its comments used shell-style `#` comments. Changed the code fence language to `xml` and converted the comments to XML comments.
- The XML versioning example used the older `cleanInterval` parameter. Current Syncthing configuration uses `cleanupIntervalS` as a direct child of `<versioning>`, with `cleanInterval` documented as a previous storage key. Updated the XML example to use `cleanupIntervalS` and included the current `fsPath` and `fsType` elements shown in the official configuration example.

## Review Notes
- The REST API examples are valid: `/rest/db/completion` can be called without `folder` or `device` query parameters for aggregate local completion, and `/rest/system/connections` is current.
- The port descriptions are consistent with current Syncthing documentation: 8384 for the GUI, 22000/TCP for TCP sync traffic, 22000/UDP for QUIC sync traffic, and 21027/UDP for local discovery.
- The Syncthing ignore pattern examples are valid, but future improvements could mention the `(?d)` prefix for operating-system-generated files that should not block directory deletion.
