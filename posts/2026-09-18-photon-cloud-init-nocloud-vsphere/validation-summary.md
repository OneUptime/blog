# Validation Summary: How to Configure Photon OS with cloud-init and a NoCloud Seed ISO on vSphere

## Status

validated

## Post Type

Tutorial / configuration guide with shell commands and YAML configuration.

## Technologies Covered

- Photon OS and RPM package inspection
- cloud-init, NoCloud metadata, and per-instance initialization
- VMware vSphere virtual CD/DVD devices and datastore ISO files
- genisoimage and ISO 9660 seed media
- YAML cloud-config, SSH public keys, and Linux user provisioning
- systemd service inspection, hostnames, and journal logs

## Sources Consulted

- [Photon OS 5 cloud-init overview](https://vmware.github.io/photon/docs-v5/administration-guide/cloud-init-on-photon-os/cloud-init-overview/) — supported capabilities, seed ISO construction, and module frequencies.
- [cloud-init 24.2 NoCloud documentation source](https://raw.githubusercontent.com/canonical/cloud-init/24.2/doc/rtd/reference/datasources/nocloud.rst) — exact release source for the post's [versioned NoCloud reference](https://docs.cloud-init.io/en/24.2/reference/datasources/nocloud.html), including metadata filenames, volume label, ISO command, and instance IDs. The rendered reference returned HTTP 429 during review; its official release source was retrieved successfully.
- [cloud-init 24.2 network configuration](https://docs.cloud-init.io/en/24.2/reference/network-config.html) — Photon-specific fallback networking behavior and configuration precedence.
- [cloud-init module reference](https://docs.cloud-init.io/en/latest/reference/modules.html) — hostname, hosts-file management, users, password locking, authorized keys, and file creation.
- [cloud-init CLI reference](https://docs.cloud-init.io/en/latest/reference/cli.html) — status output, cleanup, and diagnostic log locations.
- [cloud-init first boot determination](https://docs.cloud-init.io/en/latest/explanation/first_boot.html) — cached instance state and template preparation.
- [RPM manual](https://rpm.org/docs/6.0.x/man/rpm.8) — installed-package queries using `rpm -q`.
- [systemctl manual](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html) — installed unit-file listing.
- [journalctl manual](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html) — current-boot and service-unit filtering.
- [hostnamectl manual](https://www.freedesktop.org/software/systemd/man/latest/hostnamectl.html) — default hostname/status display. The systemd manuals were retrieved directly when browser access failed.
- [Broadcom: Some of the disks of the virtual machine failed to load](https://knowledge.broadcom.com/external/article/414005/some-of-the-disks-of-the-virtual-machine.html) — datastore ISO availability and virtual CD/DVD connection settings.

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- The seed creation command matches the examples in both Photon and upstream NoCloud documentation. The `cidata` label, root-level `user-data` and `meta-data` files, and per-deployment instance ID are appropriate.
- The YAML uses documented cloud-init keys and value types. The public-key placeholder must be replaced as instructed. The user configuration locks password authentication and does not explicitly grant sudo privileges or administrative group membership. Existing image policy and SSH service configuration still determine actual access.
- Both YAML blocks parsed successfully with PyYAML. The quoted permission value remained a string, and `lock_passwd` parsed as a boolean. All three shell blocks passed `bash -n` syntax checks.
- Keeping the template's existing DHCP configuration is consistent with the documented Photon default: fallback network rendering is disabled when no network configuration is supplied. Customized images can override that default, so the post's image-inspection prerequisite matters.
- The diagnostic commands and log locations are appropriate. `cloud-init status --long` reports current state without waiting for completion; verification should be assessed after the run finishes. Journal access may require the root console or equivalent permissions.
- The cleanup guidance correctly defers to the installed cloud-init version. Per-instance modules can be skipped when a template retains initialization state, and replacing user-data alone does not force them to rerun.
- The post links Photon 5 documentation and cloud-init 24.2 documentation without asserting that all Photon images ship cloud-init 24.2. The rolling module reference currently identifies itself as cloud-init 26.2; no deprecated configuration keys were found in the example. Service names and cleanup options should continue to be checked against the installed package.
- Disconnecting seed media remains a lifecycle decision. A reboot check on the selected image is advisable before making seed removal part of a reusable provisioning procedure.
- Review was based on official documentation and local syntax checks. No Photon guest or vSphere environment was available for end-to-end provisioning, and genisoimage was not installed locally, so ISO generation, guest initialization, and SSH authentication were not executed.
