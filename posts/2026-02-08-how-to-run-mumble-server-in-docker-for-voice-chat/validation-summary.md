# Validation Summary: How to Run Mumble Server in Docker for Voice Chat

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker
- Docker Compose
- Mumble server / Murmur
- Mumble server configuration files
- Mumble ACLs
- Ice remote administration
- Let's Encrypt / Certbot certificate files
- SQLite backups

## Sources Consulted
- Official Mumble Docker image documentation: https://github.com/mumble-voip/mumble-docker
- Official Mumble Docker image entrypoint: https://github.com/mumble-voip/mumble-docker/blob/master/entrypoint.sh
- Official Mumble server README and command-line usage: https://github.com/mumble-voip/mumble
- Official Mumble server configuration template: https://github.com/mumble-voip/mumble/blob/master/auxiliary_files/mumble-server.ini
- Official Mumble ACL documentation: https://www.mumble.info/documentation/administration/acl/
- Official Mumble server scripting documentation: https://www.mumble.info/documentation/mumble-server/scripting/
- Official Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Official Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The Docker Compose example mounted `./murmur.ini` to `/etc/murmur.ini` but did not tell the official image to use that file. Added `MUMBLE_CUSTOM_CONFIG_FILE=/etc/murmur.ini`, because the official image otherwise generates its config from `MUMBLE_CONFIG_*` variables under `/data`.
- The SuperUser password command used the older `murmurd -ini -supw` form. Updated it to `mumble-server --ini /etc/murmur.ini --set-su-pw YourNewPassword`, matching current Mumble server command-line usage.
- The `allowhtml=true` comment incorrectly described text-to-speech. Changed the comment to describe HTML support in messages, comments, and channel descriptions.
- The gRPC configuration example was outdated. Current official Mumble scripting documentation lists gRPC as unreleased/incomplete and Ice as the stable interface, so the gRPC example was removed and the virtual server note now references Ice only.
- The autoban settings were described as automatic channel cleanup. Corrected the comment to describe temporary bans for repeated connection attempts.
- The healthcheck used `nc`, but the official Mumble Docker image does not install netcat. Replaced it with a Bash TCP redirection check against `127.0.0.1:64738`.
- The performance section said server CPU usage is primarily audio encoding. Mumble clients encode audio and the server mainly handles connections, permissions, packet routing, and network traffic, so the note now recommends monitoring CPU and network usage as concurrency grows.
- The performance section implied UDP is used exclusively for voice data. Adjusted it to say UDP is used for voice traffic when possible and should not be blocked.

## Review Notes
The post is technically relevant and includes runnable Docker, Compose, shell, and Mumble configuration examples. Resource limits under `deploy.resources` are valid Compose syntax, though behavior may vary by Compose implementation and target platform.
