# Validation Summary: How to Troubleshoot Stratis Pool and Filesystem Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Stratis
- stratisd and stratis-cli
- systemd mount dependencies
- Device Mapper
- XFS
- LUKS, Clevis, NBDE/Tang, and TPM2 encryption binding
- LVM and mdraid storage considerations

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up Stratis file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/setting-up-stratis-file-systems
- Red Hat Enterprise Linux 9 documentation: Extending a Stratis pool with additional block devices: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/extending-a-stratis-pool-with-additional-block-devices
- Stratis project documentation and release notes: https://stratis-storage.github.io/
- Local `dmsetup` man page and `dmsetup --help` output for Device Mapper command behavior.

## Issues Found
- The `/etc/fstab` example used `UUID=...` with `x-systemd.requires=stratisd.service`. Updated it to the RHEL 9 documented pattern using `/dev/stratis/poolname/fsname` and the `stratis-fstab-setup@pool-uuid.service` dependency with a matching `x-systemd.after` ordering.
- The boot mount guidance said to use a UUID rather than a device path. Updated it to recommend the Stratis-maintained `/dev/stratis/...` symlink rather than an underlying device mapper path.
- The encrypted pool recovery section used `stratis pool unlock keyring`, which is not the documented RHEL 9 command. Replaced it with `stratis key set --capture-key key-description`, `stratis pool list`, and `stratis pool start --unlock-method keyring --name poolname` for stopped pools.
- The NBDE binding example had incorrect argument order and included an extra key name. Corrected it to `stratis pool bind nbde --trust-url poolname http://tang-server` and added the documented TPM binding command.
- The device mapper conflict section advised `dmsetup remove_all --force`, which can affect all device mapper stacks on the system, not only Stratis. Replaced it with a safer Stratis restart and inspection workflow.

## Review Notes
Most remaining commands are syntactically consistent with RHEL 9 Stratis documentation or standard Linux administration tools. The post is still a high-level troubleshooting guide; severe Device Mapper or failed-disk recovery cases should generally be escalated with collected diagnostics rather than handled by broad manual removal commands.
