# Validation Summary: How to Configure Elemental Cloud-Config

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elemental
- yip
- cloud-init
- YAML
- systemd
- OpenSSH
- NetworkManager
- firewalld

## Sources Consulted
- Elemental Cloud-config Reference: https://elemental.docs.rancher.com/cloud-config-reference/
- Elemental MachineRegistration reference: https://elemental.docs.rancher.com/machineregistration-reference/
- Elemental Machine Reset: https://elemental.docs.rancher.com/reset/
- Customize Elemental Installation: https://elemental.docs.rancher.com/custom-install/
- cloud-init CLI commands: https://docs.cloud-init.io/en/latest/reference/cli.html
- cloud-init examples: https://docs.cloud-init.io/en/latest/reference/examples.html
- OpenSSL passwd documentation: https://docs.openssl.org/master/man1/openssl-passwd/

## Issues Found
- The introduction overstated compatibility and execution timing. I changed it to reflect that Elemental supports a subset of cloud-init syntax, uses yip under the hood, and re-executes boot-time configuration on every boot.
- The structure example mixed valid `MachineRegistration.spec.config` content with unsupported keys. I removed `packages` and `elemental.upgrade`, added `hostname`, and clarified that the snippet represents `spec.config` in a `MachineRegistration`.
- The password guidance was incorrect. The original text called `$6$...` output from `openssl passwd -6` a bcrypt hash; I corrected it to SHA-512 hashing and updated the example to the hash-generation method documented by cloud-init.
- The `lock_passwd: false` comment was backwards. I changed it to explain that this enables password login in addition to SSH keys.
- The SSH section incorrectly said top-level `ssh_authorized_keys` are always applied to `root`. I corrected it to match Elemental's documented behavior: they apply to the first user in `users`, or to `root` if no users are defined.
- The hostname helper script assumed an `eth0` interface name. I changed it to detect the first Ethernet-style interface name instead of relying on a deprecated naming convention.
- The `runcmd` example relied on `dmidecode` and used a multiline block where Elemental documents `runcmd` entries as single strings. I replaced it with a single-string `sh -c` command that reads DMI serial data from `/sys` when available.
- The firewall example used `firewall-cmd` without first ensuring `firewalld` was running. I added `systemctl enable --now firewalld` before the firewall commands.
- The systemd service example was incomplete because it referenced `/usr/local/bin/node-setup.sh` without creating it. I added the missing script and changed `systemctl enable` to `systemctl enable --now` so the example works as written.
- The Elemental-specific configuration block used unsupported or misleading fields (`extra-partitions`, `selinux`) and omitted `reset.enabled`. I replaced those with documented `debug`, `enabled`, and `reset-oem` settings from the current MachineRegistration reference.
- The validation section used outdated or misleading commands. I replaced `cloud-init devel schema` and `pip install cloud-init` with the current `cloud-init schema --config-file ... --annotate` command and clarified that it validates a standalone `#cloud-config` file rather than a full `MachineRegistration` manifest.

## Review Notes
- The examples in the post are partial `MachineRegistration.spec.config` snippets, not complete standalone `#cloud-config` files.
- In current Elemental documentation, `MachineRegistration.spec.config.cloud-config` is added to the node and evaluated on reboot; install-time hooks must be present in installation media, typically via `SeedImage.cloud-config`.
- Because Elemental uses yip, boot-time actions should be written to be idempotent wherever possible.
