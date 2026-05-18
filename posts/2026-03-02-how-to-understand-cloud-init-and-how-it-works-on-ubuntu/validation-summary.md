# Validation Summary: How to Understand cloud-init and How It Works on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- cloud-init
- Ubuntu (cloud images)
- systemd (cloud-init-local.service, cloud-init.service, cloud-config.service, cloud-final.service)
- Cloud provider metadata services (AWS EC2 IMDS, Azure IMDS, GCE metadata, OpenStack, NoCloud, OVF)
- cloud-config YAML format
- netplan / systemd-networkd (referenced for network configuration)

## Sources Consulted
- Official cloud-init documentation: https://docs.cloud-init.io/en/latest/
- cloud-init instance-data reference: https://docs.cloud-init.io/en/latest/explanation/instancedata.html
- Local `cloud-init --version` (25.2 on Ubuntu 24.04) and `cloud-init query --help` output
- Ubuntu's default `/etc/cloud/cloud.cfg` module layout
- cloud-init boot stages documentation
- AWS EC2 instance metadata service documentation (169.254.169.254)

## Issues Found
- **`cloud-init query local-hostname`**: The standardized v1 instance-data keys use underscores, not dashes. The cloud-init documentation defines the key as `local_hostname` (and `instance_id`, `public_ssh_keys`, etc., all with underscores). The post had `public_ssh_keys` already correct but used `local-hostname` with a dash. Fixed to `local_hostname` to match the documented key naming and so the query will actually succeed.

## Review Notes
- The five execution stages (Generator, Local, Network, Config, Final) and the four service unit names (`cloud-init-local.service`, `cloud-init.service`, `cloud-config.service`, `cloud-final.service`) are accurate.
- The module list under `cloud_init_modules`, `cloud_config_modules`, and `cloud_final_modules` accurately reflects the modules shipped with cloud-init on recent Ubuntu releases, including the mixed dash/underscore naming that actually appears in `/etc/cloud/cloud.cfg` (e.g., `set_hostname`, `users-groups`, `write-files`).
- The module frequency values `always`, `once-per-instance`, and `once` are the correct documented frequency strings.
- The cloud-config example is syntactically valid YAML and uses correct directives (`hostname`, `fqdn`, `users`, `packages`, `write_files`, `runcmd`, `package_update`, `package_upgrade`).
- `cloud-init query ds` is valid because `ds` is exposed as a top-level key in `/run/cloud-init/instance-data.json`. Modern cloud-init also provides a separate `cloud-id` command that returns just the cloud name — that could be a useful future addition but is not an error.
- `cloud-init clean --logs` followed by `cloud-init init` is a reasonable test invocation, though a full re-run also typically involves `cloud-init init --local`, `cloud-init modules --mode=config`, and `cloud-init modules --mode=final`. The simplified guidance is fine in context.
- The EC2 IMDS endpoint (169.254.169.254) is correct and consistent across IMDSv1 and IMDSv2.
