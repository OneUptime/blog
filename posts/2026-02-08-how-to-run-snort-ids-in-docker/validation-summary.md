# Validation Summary: How to Run Snort IDS in Docker

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker
- Docker Compose
- Snort IDS
- Snort rules
- Snort preprocessors and output plugins
- Linux packet capture and sysctl tuning
- Syslog forwarding
- Barnyard2 / Unified2

## Sources Consulted
- Snort 3 Rule Writing Guide, configuration: https://docs.snort.org/start/configuration
- Snort 3 Rule Writing Guide, installation: https://docs.snort.org/start/installation
- Snort 3 Rule Writing Guide, command line basics: https://docs.snort.org/start/help
- Snort 3 Rule Writing Guide, alert logging: https://docs.snort.org/start/alert_logging
- Snort Users Manual 2.9.16: https://manual-snort-org.s3-website-us-east-1.amazonaws.com/
- Snort downloads and rules archives: https://www.snort.org/downloads
- Ubuntu 22.04 `snort` package details: https://packages.ubuntu.com/jammy/snort
- Ubuntu 22.04 `snort-rules-default` package details: https://packages.ubuntu.com/jammy/snort-rules-default
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Local verification with Docker 29.4.2, Docker Compose v5.1.3, and `snort -T` inside the extracted example image.

## Issues Found
- The post claimed to deploy Snort 3, but the Dockerfile installed Ubuntu 22.04's `snort` package, which is Snort 2.9.15.1. Updated the article to describe an Ubuntu-packaged Snort 2.9 deployment, matching the classic `snort.conf` syntax used throughout the guide.
- The Dockerfile listed Snort 3-oriented or incorrect package dependencies, including `libdaq3`. Replaced them with the packaged `snort` and `snort-rules-default` packages plus the troubleshooting tools used by the guide.
- The Dockerfile copied `local.rules` from the build context root while Docker Compose mounted `./rules` over `/etc/snort/rules`. Changed the copy path to `rules/local.rules`.
- The Compose command passed `--daq-dir /usr/lib/daq`, which was unnecessary for the Ubuntu packaged Snort 2.9 image and could point users at the wrong DAQ module location. Removed it.
- The custom `snort.conf` used an absolute `RULE_PATH` with Snort include statements, which the packaged Snort parser resolved incorrectly from `/etc/snort`. Changed `RULE_PATH` to the relative `rules` directory.
- The custom rules used `classtype` values without including the packaged `reference.config` and `classification.config`. Added those standard includes.
- The `stream5_tcp` preprocessor used `policy balanced`, which Snort 2.9 rejected. Changed it to the valid `policy linux` setting.
- The config included `community-rules.rules`, but the official community archive extracts to `community-rules/community.rules`. Updated the path and left it commented until after extraction so the base container can start before optional community rules are downloaded.
- The subscriber rules example used a Snort 3 snapshot name (`31000`) in a Snort 2.9 guide. Changed it to a Snort 2.9 snapshot example and noted that it should match the installed Snort version.
- The HTTP curl test did not match the SQL injection rule contents. Replaced it with a URL containing `SELECT`, `FROM`, and `WHERE`.
- The rule examples used deprecated inline `threshold` options. Replaced them with `detection_filter`.
- The performance command used `snort --pcap-show-stats`, which is not the right way to inspect live container packet-drop stats. Replaced it with checking recent Snort logs for dropped-packet counters.

## Review Notes
The corrected Dockerfile, `snort.conf`, and `local.rules` snippets were extracted into a temporary build context, built successfully with Docker, and validated with `snort -T` inside the resulting container. The examples still assume the capture interface is `eth0`; users may need to replace it with the actual host interface name.
