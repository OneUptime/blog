# Validation Summary: How to Run NTP Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Dockerfile
- Chrony / chronyd / chronyc
- NTP / NTPv4
- systemd-timesyncd
- Linux networking and time synchronization

## Sources Consulted
- Docker CLI `docker run --help` output for `--detach`, `--name`, `--publish`, and `--cap-add`.
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy/resources reference: https://docs.docker.com/reference/compose-file/deploy/
- Dockerfile reference for `EXPOSE`, `ENTRYPOINT`, and health checks: https://docs.docker.com/reference/dockerfile/
- Docker run reference for port publishing and detached containers: https://docs.docker.com/engine/containers/run/
- Chrony `chrony.conf(5)` documentation: https://chrony-project.org/doc/4.7/chrony.conf.html
- Chrony `chronyd(8)` documentation: https://chrony-project.org/doc/4.8/chronyd.html
- Chrony `chronyc(1)` documentation: https://chrony-project.org/doc/4.7/chronyc.html
- cturra/docker-ntp README and startup script: https://github.com/cturra/docker-ntp
- RFC 5905, Network Time Protocol Version 4: https://www.rfc-editor.org/info/rfc5905
- systemd `timesyncd.conf` documentation: https://www.freedesktop.org/software/systemd/man/timesyncd.conf.html

## Issues Found
- The quick-start command added `SYS_TIME` for `cturra/ntp` and said the container adjusts the system clock. The referenced image runs Chrony with `-x`, so it does not control the host system clock. Removed `--cap-add SYS_TIME` and corrected the explanation.
- The production Compose example used `cturra/ntp` while bind-mounting `/etc/chrony/chrony.conf` read-only. The image startup script regenerates that file, so this would fail or ignore the intended custom configuration. Changed the example to build and run the custom image shown in the post.
- The Compose example claimed persistent state but mounted `/var/lib/chrony` as `tmpfs`, which would erase the drift file on restart. Replaced it with a named volume.
- The Compose snippets used the obsolete top-level `version` field. Removed it after validating with current Docker Compose.
- The Chrony config included `deny all` after `allow` rules. Chrony denies clients by default unless allowed, and an explicit `deny all` would override the intended local-network access. Removed the directive and clarified the default behavior.
- The custom Docker image used `chronyd -s` and host clock/RTC directives, which are not appropriate for a containerized NTP server that should not discipline the Docker host clock. Changed the image to use `chronyd -d -x` and removed `rtcsync` / `makestep` from the sample config.
- The health check used `pgrep` without installing a package that reliably provides it in Alpine. Added `procps`.
- The health check counted all server-mode sources (`^`) as reachable, including unreachable sources. Updated the pattern to count selected/selectable sources based on Chrony's source state column.
- The redundant server example mapped the secondary service to host UDP port 124, but normal NTP clients use UDP 123. Changed the example to bind each server to UDP 123 on distinct host IPs.
- The post overstated that a local NTP server is essential for microsecond-level precision. Reworded it to note that microsecond-level needs typically require specialized time sources or PTP.

## Review Notes
- Verified the corrected Chrony configuration with `chronyd -p` in an Alpine 3.19 container.
- Verified the corrected Compose snippets with `docker compose config -q`.
- The post is now technically valid as a Dockerized NTP server guide. For future production-hardening, it could mention that clients should normally use multiple independent NTP servers and that very high-precision environments should evaluate PTP, PPS/GPS, and hardware timestamping.
