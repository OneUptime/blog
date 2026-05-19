# Validation Summary: How to Debug cloud-init Issues on Ubuntu Cloud Instances

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ubuntu
- cloud-init
- cloud-config YAML
- systemd and journalctl
- netplan
- AWS instance metadata service

## Sources Consulted
- cloud-init CLI help from local package `/usr/bin/cloud-init 25.2-0ubuntu1~24.04.1`
- cloud-init CLI commands documentation: https://cloudinit.readthedocs.io/en/stable/reference/cli.html
- cloud-init status documentation: https://cloudinit.readthedocs.io/en/latest/howto/status.html
- cloud-init failure modes documentation: https://cloudinit.readthedocs.io/en/latest/explanation/failure_states.html
- cloud-init boot stages documentation: https://cloudinit.readthedocs.io/en/latest/explanation/boot.html
- cloud-init runcmd module documentation: https://cloudinit.readthedocs.io/en/stable/reference/modules.html#runcmd
- cloud-init re-run documentation: https://cloudinit.readthedocs.io/en/latest/howto/rerun_cloud_init.html
- cloud-init first boot determination documentation: https://cloudinit.readthedocs.io/en/latest/explanation/first_boot.html
- cloud-init cloud-config documentation: https://cloudinit.readthedocs.io/en/stable/explanation/about-cloud-config.html

## Issues Found
- `cloud-init status --long` was described as showing timing information and had an outdated sample output. Updated the text and sample to reflect current detailed status fields such as `extended_status`, `boot_status_code`, `errors`, and `recoverable_errors`.
- The Bash-specific `runcmd` example used `set -euo pipefail` and process substitution in a string item, but `runcmd` string items are interpreted by `sh`. Changed the example to execute the block through `bash -lc` using list form.
- The `cloud-init clean` warning said it resets the instance ID. Updated this to say it removes cached cloud-init state so the next boot is treated like first boot.
- The `cloud-init single` debug example placed `--debug` after the subcommand, but current cloud-init exposes `--debug` as a global flag. Changed it to `sudo cloud-init --debug single ...`.

## Review Notes
The corrected `runcmd` YAML snippet was validated with `cloud-init schema` on cloud-init 25.2. The article is Ubuntu-focused; netplan paths and systemd service names are appropriate for standard Ubuntu cloud images, though exact rendered network configuration can still vary by image and datasource.
