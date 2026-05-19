# Validation Summary: How to Disable cloud-init on Ubuntu After Initial Setup

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- cloud-init
- systemd services and masking
- GRUB kernel command-line parameters
- Netplan network configuration
- APT package removal

## Sources Consulted
- cloud-init documentation: Disable cloud-init: https://docs.cloud-init.io/en/latest/howto/disable_cloud_init.html
- cloud-init documentation: Network configuration: https://docs.cloud-init.io/en/latest/reference/network-config.html
- cloud-init documentation: Boot stages: https://docs.cloud-init.io/en/latest/explanation/boot.html
- cloud-init documentation: Base configuration reference: https://docs.cloud-init.io/en/latest/reference/base_config_reference.html
- cloud-init documentation: Module reference: https://docs.cloud-init.io/en/latest/reference/modules.html
- cloud-init documentation: CLI reference and status command: https://docs.cloud-init.io/en/latest/reference/cli.html
- cloud-init documentation: Reported status and disable reasons: https://docs.cloud-init.io/en/latest/howto/status.html
- systemd systemctl documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The systemd service examples assumed the network-stage service is always named `cloud-init.service`. Current cloud-init documentation uses `cloud-init-network.service` for that stage, while Ubuntu releases may still expose `cloud-init.service`. Added a command to list installed cloud-init unit names and a note to substitute `cloud-init-network.service` where applicable.
- The Puppet drop-in example claimed to disable `cc_puppet`, but adding a `puppet:` key activates the Puppet module, and the shown `start` key is not a current cloud-init Puppet setting. Removed the misleading drop-in example and kept the direct module-list editing guidance.

## Review Notes
- The disable marker file, `cloud-init=disabled` kernel parameter, `network: config: disabled`, module-list keys, per-boot script behavior, `cloud-init status`, and package purge commands were consistent with the consulted documentation.
- Removing modules from `cloud.cfg` is technically possible, but cloud-init documentation cautions that changing base configuration is mainly for image creators and can make systems unreachable if done incorrectly.
