# Validation Summary: How to Install and Configure Gogs Lightweight Git Service on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- DNF
- Gogs
- Git
- OpenSSH
- systemd
- journalctl
- SQLite

## Sources Consulted
- Gogs installation documentation: https://gogs.io/getting-started/installation
- Gogs configuration primer: https://gogs.io/fine-tuning/configuration-primer
- Gogs run as service documentation: https://gogs.io/fine-tuning/run-as-service
- Gogs v0.14.2 release metadata: https://github.com/gogs/gogs/releases/tag/v0.14.2
- Gogs default configuration for v0.14.2: https://raw.githubusercontent.com/gogs/gogs/v0.14.2/conf/app.ini
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Local command help for systemctl and journalctl.

## Issues Found
- The original installation command used `sudo dnf install -y <package-name>`, which was a placeholder and would not install Gogs or its required tools. I replaced it with RHEL package installation for `git`, `wget`, `tar`, and `openssh-server`, then added official Gogs release download and extraction commands.
- The original guide did not create the dedicated `git` service user expected by the default Gogs systemd service file. I added a `useradd` command and ownership fix for `/home/git/gogs`.
- The original configuration path `/etc/<service>/config.conf` was not a valid Gogs configuration path. I changed it to `/home/git/gogs/custom/conf/app.ini`, which matches Gogs' documented custom configuration location.
- The original service commands used `<service-name>`, which would not work. I replaced them with the actual `gogs` systemd unit name and added installation of the Gogs-provided systemd unit from `scripts/systemd/gogs.service`.
- The original verification and troubleshooting commands used placeholder service and package names. I replaced them with `systemctl status gogs`, `journalctl -u gogs`, and `rpm -q git wget tar openssh-server`.
- The original post did not include a valid Gogs configuration example. I added a minimal `app.ini` snippet using current Gogs v0.14.2 keys such as `EXTERNAL_URL`, `TYPE = sqlite3`, and `PATH`.

## Review Notes
The guide now describes a minimal binary installation using SQLite. Production deployments may need a stronger database backend, HTTPS or a reverse proxy, firewall rules, backups, and site-specific hardening, but those additions are outside the scope of this validation pass.
