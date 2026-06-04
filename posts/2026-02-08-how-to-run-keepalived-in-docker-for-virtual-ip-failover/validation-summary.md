# Validation Summary: How to Run Keepalived in Docker for Virtual IP Failover

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Docker
- Docker Compose
- Keepalived
- VRRP
- Linux networking capabilities
- Nginx
- HAProxy
- Alpine Linux

## Sources Consulted
- Keepalived configuration manual: https://www.keepalived.org/manpage.html
- Keepalived command manual: https://www.mankier.com/8/keepalived
- osixia/keepalived official Docker Hub documentation: https://hub.docker.com/r/osixia/keepalived
- osixia/container-keepalived official GitHub repository: https://github.com/osixia/container-keepalived
- Docker host network driver documentation: https://docs.docker.com/engine/network/drivers/host/
- Docker run capabilities documentation: https://docs.docker.com/engine/containers/run/
- Docker Compose Specification documentation for obsolete `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Alpine Linux release branches: https://alpinelinux.org/releases/
- RFC 9568, Virtual Router Redundancy Protocol Version 3: https://www.rfc-editor.org/rfc/rfc9568.html
- RFC 5798, previous VRRPv3 specification: https://www.rfc-editor.org/info/rfc5798

## Issues Found
- The post claimed it covered active-active configurations, but it only provided active-passive failover examples. Updated the wording to match the actual content.
- The prerequisites and Docker examples omitted `NET_RAW`, which the official osixia/keepalived documentation requires for VRRP packet handling. Added `NET_RAW` to the prerequisites, Compose examples, and `docker run` example.
- The osixia image tag and custom configuration mount path were outdated for the current osixia/keepalived documentation. Updated examples to `osixia/keepalived:2.3.4` and mounted custom configs at `/etc/keepalived/keepalived.conf`.
- Compose examples used the obsolete top-level `version: "3.8"` property. Removed it from the examples.
- `auth_pass secretkey123` exceeded Keepalived's eight-character PASS authentication limit. Shortened it to `secret12`.
- The Nginx health check used `/health`, but the provided Nginx example did not create that endpoint. Changed the example to check whether port 80 accepts TCP connections.
- The HAProxy health check used `killall -0 haproxy`, but the Keepalived and HAProxy services run in separate containers, so the Keepalived container cannot reliably see the HAProxy process without sharing the PID namespace. Changed it to check the HAProxy listener on localhost port 80.
- The failover test attempted to read `/tmp/keepalived.data` without first triggering Keepalived to write the data file. Added a SIGUSR1 command against the running Keepalived pid before reading the file.
- The monitoring section described `keepalived --dump-conf` as a current-state command. Updated it to describe the command as dumping parsed configuration.
- The production section described VRRP PASS authentication as protection against rogue VRRP instances. Updated the wording to explain that PASS is not strong protection against hostile hosts on the same Layer 2 network.
- The closing statement claimed sub-second detection times, but the shown `advert_int 1` configuration does not support that claim. Changed it to "fast detection times."
- The custom Dockerfile used `alpine:3.19`, which is end-of-life by the validation date. Updated it to `alpine:3.23`, a supported Alpine release branch.

## Review Notes
- Docker Hub rate limiting prevented live inspection of the `osixia/keepalived:2.3.4` image in the local environment, so image-specific fixes were validated against the official osixia Docker Hub and GitHub documentation.
- VRRPv3's current RFC does not include authentication; Keepalived still supports an authentication block for compatibility, but it should not be presented as a strong security control.
