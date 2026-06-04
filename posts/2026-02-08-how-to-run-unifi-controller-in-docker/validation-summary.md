# Validation Summary: How to Run Unifi Controller in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- LinuxServer.io UniFi Network Application container
- MongoDB official container
- UniFi Network device adoption and ports
- Linux shell commands
- Cron

## Sources Consulted
- LinuxServer.io UniFi Network Application image documentation: https://docs.linuxserver.io/images/docker-unifi-network-application/
- Ubiquiti Required Ports Reference: https://help.ui.com/hc/en-us/articles/218506997-Required-Ports-Reference
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- MongoDB Official Docker Image documentation: https://hub.docker.com/_/mongo
- Local Docker CLI help output for `docker compose up`, `docker compose logs`, and `docker compose config`

## Issues Found
- The post said the LinuxServer.io image bundles MongoDB. Current LinuxServer.io documentation states that the `unifi-network-application` image requires an external MongoDB database, so the text was corrected to describe a separate MongoDB container.
- The Compose example omitted `MONGO_AUTHSOURCE`, which LinuxServer.io documents as a required MongoDB connection variable. Added `MONGO_AUTHSOURCE: admin` to the controller service.
- The MongoDB init script used a JavaScript file that created only `unifi` and `unifi_stat` users and hardcoded the password. LinuxServer.io currently documents an `init-mongo.sh` script that authenticates as the root user, creates the UniFi user in the auth source, and grants `clusterMonitor` plus ownership of `unifi`, `unifi_stat`, `unifi_audit`, and `unifi_restore`. Replaced the snippet and mounted file name accordingly.
- The MongoDB service did not pass the UniFi database variables needed by the documented init script. Added `MONGO_USER`, `MONGO_PASS`, `MONGO_DBNAME`, and `MONGO_AUTHSOURCE` to the MongoDB container environment.
- The post claimed cameras report to the UniFi Network Controller. UniFi cameras are managed by UniFi Protect, not UniFi Network, so the camera reference was removed.
- The Compose snippet used top-level `version: "3.8"`. Current Docker Compose accepts it but reports it as obsolete, so it was removed.
- The backup section included an unauthenticated UniFi API backup `curl` command that would not work as shown. Removed that command and kept the web UI and file-level volume backup guidance.

## Review Notes
- The corrected Docker Compose snippet was validated with `docker compose config -q`.
- The corrected MongoDB init shell snippet was validated with `bash -n`.
- The post still uses the older "Unifi Controller" wording in prose, but the container and configuration use the current `unifi-network-application` image name.
