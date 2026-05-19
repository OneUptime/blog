# Validation Summary: How to Install GoCD for Continuous Delivery on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- GoCD (server and agent)
- Ubuntu / Debian APT package management
- systemd service management
- Nginx reverse proxy
- Let's Encrypt / certbot for TLS
- GoCD YAML Configuration Plugin (format_version 10)
- Docker / docker-compose for deployment tasks
- Bash / shell tasks

## Sources Consulted
- GoCD official documentation: https://docs.gocd.org/current/
- GoCD installation docs (Debian/Ubuntu): https://docs.gocd.org/current/installation/install/server/linux.html
- GoCD agent installation: https://docs.gocd.org/current/installation/install/agent/linux.html
- GoCD YAML Configuration Plugin: https://github.com/tomzo/gocd-yaml-config-plugin
- GoCD configuration reference for `/etc/default/go-server` and `/etc/default/go-agent`
- GoCD Health API: https://api.gocd.org/current/#health
- GoCD pipeline locking documentation (`lock_behavior` field)

## Issues Found

1. **Invalid YAML field `locking: single` (3 occurrences)** — The GoCD YAML Configuration Plugin (format_version 10) does not support a `locking` field with value `single`. The correct field name is `lock_behavior`, and the supported values are `none`, `unlockWhenFinished`, and `lockOnFailure`. Replaced all three occurrences of `locking: single` with `lock_behavior: unlockWhenFinished`, which provides the closest behavior to what was described (a pipeline that runs one instance at a time and automatically unlocks when finished).

2. **Bogus reference to `/etc/go/go-site.sh`** — The post instructed the reader to run `sudo nano /etc/go/go-site.sh`, but that file does not exist in any GoCD installation. The very next sentence correctly explained that the site URL must be set through the admin UI (Admin > Server Configuration > Site URL), making the nano command both incorrect and contradictory. Removed the nano command and kept the (correct) admin UI instruction.

## Review Notes

- The APT repository setup (GPG key URL `https://download.gocd.org/GOCD-GPG-KEY.asc`, repo line `deb [signed-by=...] https://download.gocd.org /`) matches the current official GoCD installation instructions.
- Package names (`go-server`, `go-agent`), default ports (8153 HTTP, 8154 HTTPS), config file locations (`/etc/default/go-server`, `/etc/default/go-agent`), log paths (`/var/log/go-server/`, `/var/log/go-agent/`), and the `GO_SERVER_URL` environment variable for agent config are all correct.
- The health API endpoint `/go/api/v1/health` is valid.
- `format_version: 10` is the current version of the GoCD YAML Config Plugin format.
- The YAML pipeline example uses a YAML anchor (`&deploy_job`) and merge key (`<<: *deploy_job`) — this is standard YAML and supported by the GoCD YAML plugin.
- For setting Java heap, the post uses `GO_SERVER_SYSTEM_PROPERTIES="-Xms512m -Xmx2048m"`. The more idiomatic approach in GoCD is to use the dedicated `SERVER_MEM` / `SERVER_MAX_MEM` variables in `/etc/default/go-server`, but the system-properties approach works and is technically correct, so it was left as-is.
- Agent registration behavior described (agents appear as "Pending" and require manual enablement via the Agents page) is accurate for default GoCD configurations without an auto-register key.
