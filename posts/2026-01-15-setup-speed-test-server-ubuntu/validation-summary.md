# Validation Summary: How to Set Up a Speed Test Server on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu 22.04 LTS and 24.04 LTS
- LibreSpeed
- Nginx
- PHP-FPM and PHP extensions
- SQLite and MySQL/MariaDB telemetry storage
- Docker Compose
- Ookla Speedtest Server
- iPerf3
- Bash, Python, JavaScript, YAML, SQL, systemd, Certbot

## Sources Consulted
- LibreSpeed official documentation: https://github.com/librespeed/speedtest/blob/master/doc.md
- LibreSpeed Docker documentation: https://github.com/librespeed/speedtest/blob/master/doc_docker.md
- LibreSpeed telemetry settings source: https://github.com/librespeed/speedtest/blob/master/results/telemetry_settings.php
- LibreSpeed MySQL telemetry schema: https://github.com/librespeed/speedtest/blob/master/results/telemetry_mysql.sql
- LibreSpeed JavaScript API source: https://github.com/librespeed/speedtest/blob/master/speedtest.js
- LibreSpeed backend source files: https://github.com/librespeed/speedtest/tree/master/backend
- Docker Compose documentation: https://docs.docker.com/compose/
- Ookla host program: https://www.ookla.com/host
- OoklaServer installer endpoint: https://install.speedtest.net/ooklaserver/ooklaserver.sh
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Local command/package checks for Ubuntu package names, Docker Compose, YAML parsing, Python compilation, and JavaScript syntax.

## Issues Found
- Corrected the LibreSpeed PHP requirement from "PHP 7.0 or higher" to the upstream requirement of PHP 5.4 or newer, with PHP 8.0 or newer needed for ISP and distance detection.
- Added `php-sqlite3` and `php-mysql` to the PHP package installation because LibreSpeed telemetry requires PDO drivers for SQLite/MySQL storage.
- Clarified PHP-FPM socket paths for Ubuntu 22.04 and 24.04, and replaced hardcoded PHP-FPM tuning/restart/status commands with commands that derive the installed PHP major/minor version.
- Fixed the LibreSpeed example HTML copy path from the repository root to the current `examples/` directory.
- Fixed the JavaScript customization snippet so download/upload stream settings use `xhr_dlMultistream` and `xhr_ulMultistream`; `count_ping` is now described as ping sample count.
- Replaced the custom multi-server selection code with LibreSpeed's supported `addTestPoints`, `selectServer`, and `setSelectedServer` APIs.
- Removed an incorrect Nginx CORS preflight `location = /backend/` block that would not match backend PHP endpoint requests and documented LibreSpeed's built-in `cors=true` behavior for multiple points of test.
- Corrected telemetry configuration examples from a non-existent `$Rone_settings[...]` array to the current LibreSpeed variables such as `$db_type`, `$Sqlite_db_file`, `$MySql_*`, `$redact_ip_addresses`, `$enable_id_obfuscation`, and `$stats_password`.
- Removed the non-existent `telemetry_settings.php.template` copy command; the cloned LibreSpeed repository already contains `results/telemetry_settings.php`.
- Replaced the hand-written MySQL table definition with importing LibreSpeed's official `telemetry_mysql.sql` schema.
- Updated the Docker Compose example to use the official `ghcr.io/librespeed/speedtest:latest` image, the default container port `8080`, `DB_PORT`, `GDPR_EMAIL`, official schema initialization, and current `docker compose` commands.
- Removed an undeclared custom Docker bind mount for `./custom/index.html` that would break the compose example unless the file already existed.
- Reworked the Ookla alternative to use the published OoklaServer installer flow and removed unverified placeholder properties and daemon flags.
- Updated the Python API example to use timezone-aware `datetime.now(timezone.utc)` instead of deprecated `datetime.utcnow()`, and removed an unused import.

## Review Notes
The post is technically relevant and validates after fixes. Some operational guidance, such as exact capacity planning, firewall rules for every optional service, and production-grade secret management, could be expanded in a future editorial pass, but the reviewed commands and snippets are now aligned with the consulted upstream documentation.
