# Validation Summary: How to Install and Configure Fleet (osquery Manager) on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Fleet
- fleetctl
- osquery
- MySQL
- Redis
- systemd
- TLS certificates

## Sources Consulted
- Fleet server configuration documentation: https://fleetdm.com/docs/configuration/fleet-server-configuration
- Fleet host enrollment documentation: https://fleetdm.com/guides/enroll-hosts
- Fleet fleetctl documentation: https://fleetdm.com/guides/fleetctl
- Fleet Linux osquery enrollment guide: https://fleetdm.com/guides/how-to-install-osquery-and-enroll-linux-devices-into-fleet
- Fleet GitHub releases API: https://api.github.com/repos/fleetdm/fleet/releases/latest
- osquery command line flags documentation: https://osquery.readthedocs.io/en/5.5.0/installation/cli-flags/
- Fleet osquery table reference for `augeas`: https://fleetdm.com/tables/augeas
- Fleet osquery table reference for `etc_hosts`: https://fleetdm.com/tables/etc_hosts
- Ubuntu package management documentation: https://ubuntu.com/server/docs/how-to/software/package-management/index.html

## Issues Found
- The MySQL user was created as `fleet`@`localhost` while Fleet was configured to connect to `127.0.0.1:3306`. Changed the user and verification command to use `127.0.0.1` consistently.
- The prerequisites described Ubuntu 20.04 and 22.04 as hard Fleet requirements. Reworded this as the guide's assumed Ubuntu versions and added Ubuntu 24.04.
- The Fleet version and release asset names were outdated. Updated the article to Fleet 4.85.0, corrected the current `fleetctl` Linux AMD64 archive name, and fixed the extracted binary paths.
- The Fleet configuration used obsolete/incorrect `auth.jwt_key` guidance and an unsupported `logging.level` field. Replaced it with `app.token_key` and removed the invalid logging field.
- The server configuration disabled TLS even though osquery TLS enrollment requires TLS. Updated the configuration to use TLS certificate/key paths and added a self-signed certificate command for testing.
- The `fleetctl` setup command used HTTP. Updated it to HTTPS with `--tls-skip-verify` for the self-signed testing case.
- The osquery installation commands used deprecated `apt-key`. Replaced them with a scoped keyring and `signed-by` repository entry.
- The manual osquery certificate download referenced a non-documented `/assets/fleet.pem` URL. Replaced it with copying the Fleet server certificate or CA chain to the client.
- The `fleetctl package` example used the invalid `--output` flag. Replaced it with the current `--outfile` flag and included `--fleet-certificate` for self-signed TLS.
- The host details example used an unsupported `fleetctl get host --name` flag. Changed it to pass the hostname as the command argument.
- The `fleetctl get query-results` command does not exist. Replaced it with reading the configured Fleet result log.
- The SSH root login policy queried `etc_hosts` for an SSH configuration key, which is not a valid table/column combination. Replaced it with an `augeas` query against `/etc/ssh/sshd_config`.
- The upgrade example moved the wrong extracted path. Updated it to move the Fleet binary from the versioned extraction directory.

## Review Notes
- The post still uses self-signed TLS examples for testing. In production, use a certificate trusted by enrolled hosts and avoid `--tls-skip-verify`.
