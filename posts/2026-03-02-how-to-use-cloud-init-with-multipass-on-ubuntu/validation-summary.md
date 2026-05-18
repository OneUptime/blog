# Validation Summary: How to Use cloud-init with Multipass on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Multipass (Canonical's lightweight VM manager)
- cloud-init (cloud-config YAML)
- Ubuntu (LTS images, 22.04)
- KVM / QEMU (Multipass hypervisor on Linux)
- snap (install method)
- NodeSource setup script (Node.js 20.x install)
- Docker (get.docker.com install script)
- PostgreSQL (14 example with pg_hba.conf and conf.d)
- Nginx (reverse proxy site config)
- Certbot (mentioned for SSL)
- NTP / timezone / hostname cloud-init modules

## Sources Consulted
- Multipass official documentation — launch command reference: https://documentation.ubuntu.com/multipass/en/latest/reference/command-line-interface/launch/
- Multipass official documentation — info command reference: https://documentation.ubuntu.com/multipass/en/latest/reference/command-line-interface/info/
- cloud-init module documentation: https://docs.cloud-init.io/en/latest/reference/modules.html
- Ubuntu release naming reference (22.04 = Jammy Jellyfish, 20.04 = Focal Fossa)

## Issues Found
1. **Misleading comment on `multipass info --all`**: The original comment said "Check system requirements are met", but this command actually shows information about all VM instances — it does not check host system requirements. Changed the comment to "Show info for all instances (none yet right after install)" to accurately describe the command's behavior.
2. **Inconsistent Ubuntu codename**: The example used `multipass launch 22.04 --name focal-vm`, but Ubuntu 22.04 is "Jammy Jellyfish"; "Focal" is the codename for 20.04. Renamed the instance to `jammy-vm` so the codename matches the requested release.

## Review Notes
- The `write_files` content blocks in the "Development Environment" example include `$(node --version)` and `$(npm --version)` in the motd. `write_files` writes content literally — these will not be expanded as shell substitutions. The post does not claim they will be expanded, so this is not strictly incorrect, but readers who copy this expecting dynamic version output may be surprised. Consider moving such dynamic content into a `runcmd` that writes the file with shell substitution after Node is installed.
- The PostgreSQL example hard-codes the path `/etc/postgresql/14/main/conf.d/custom.conf`. Ubuntu 22.04 ships PostgreSQL 14, but Ubuntu 24.04 ships PostgreSQL 16. Users on a different Ubuntu release will need to adjust this path. The post is reasonable as-is for 22.04 readers.
- `multipass info --all` is supported by the Multipass CLI in practice, even though the official reference page primarily documents `multipass info` without arguments as the way to see all instances. The flag works and produces equivalent output.
- All Multipass launch flags (`--name`, `--cpus`, `--memory`, `--disk`, `--cloud-init`) match current upstream documentation. Image positional arguments (`22.04`, `lts`) are also supported.
- All cloud-init keys used (`packages`, `package_update`, `package_upgrade`, `users`, `runcmd`, `write_files`, `timezone`, `ntp`, `hostname`) are valid and documented cloud-config modules.
- `multipass umount` is the correct command (not `unmount`).
- Debugging commands (`cloud-init status --wait`, `cloud-init status --long`, `cloud-init clean --logs`, `cloud-init init`) are valid cloud-init subcommands.
