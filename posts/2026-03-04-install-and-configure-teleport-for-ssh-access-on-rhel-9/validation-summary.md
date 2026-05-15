# Validation Summary: How to Install and Configure Teleport for SSH Access on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Teleport
- RHEL 9
- CentOS Stream 9
- DNF/RPM packages
- systemd
- SELinux file context inspection

## Sources Consulted
- Teleport Linux installation documentation: https://goteleport.com/docs/installation/linux/
- Teleport CLI reference: https://goteleport.com/docs/reference/cli/teleport/
- Teleport configuration reference: https://goteleport.com/docs/reference/deployment/config/
- Teleport release support documentation: https://goteleport.com/docs/upcoming-releases/

## Issues Found
- The installation command used the placeholder `sudo dnf install -y <package-name>`, which was not a valid Teleport installation procedure. I replaced it with the official DNF repository setup for RHEL or CentOS Stream and installation of the `teleport` package.
- The configuration path `/etc/<service>/config.conf` was not correct for Teleport. I replaced it with the default Teleport configuration path, `/etc/teleport.yaml`.
- The service name placeholder `<service-name>` was not executable. I replaced it with the actual systemd service name, `teleport`.
- The post did not include the required Teleport cluster details for enrolling an SSH node. I added the prerequisite for a proxy address, join token, and CA pin, and used `teleport node configure` to generate a valid SSH node configuration.
- The verification and troubleshooting commands used generic placeholders. I updated them to use `systemctl status teleport`, `journalctl -u teleport`, and an RPM package check for Teleport.

## Review Notes
The updated guide installs Teleport Community Edition from the current v18 stable channel. Teleport Enterprise Self-Hosted users should set the package name to `teleport-ent`, as noted in the post.
