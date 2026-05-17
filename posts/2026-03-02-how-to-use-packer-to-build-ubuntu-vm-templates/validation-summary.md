# Validation Summary: How to Use Packer to Build Ubuntu VM Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Packer (HCL2 templates)
- Ubuntu 22.04 LTS Server (live ISO)
- Subiquity autoinstall (cloud-init)
- QEMU/KVM (qemu builder plugin)
- Proxmox VE (proxmox-iso builder plugin)
- Bash provisioner scripts
- sysctl, journald, chrony, cloud-init

## Sources Consulted
- Packer QEMU plugin docs: https://developer.hashicorp.com/packer/integrations/hashicorp/qemu/latest/components/builder/qemu
- Packer Proxmox plugin docs: https://developer.hashicorp.com/packer/integrations/hashicorp/proxmox/latest/components/builder/iso
- Packer shell provisioner docs: https://developer.hashicorp.com/packer/docs/provisioners/shell
- HashiCorp apt repository install instructions: https://developer.hashicorp.com/packer/install
- Ubuntu Subiquity autoinstall reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html

## Issues Found
1. **`scripts/configure-template.sh` lacked `sudo`** — The Packer shell provisioner runs scripts as the SSH user (`ubuntu`), not root. The default `execute_command` is `chmod +x {{.Path}}; {{.Vars}} {{.Path}}`, with no implicit privilege elevation. Commands like `apt-get install`, `systemctl enable`, `timedatectl`, `sed -i /etc/systemd/journald.conf`, and writing to `/etc/sysctl.d/` would all fail with permission errors. Fixed by prefixing each privileged command with `sudo`, and replacing the redirected `cat >> /etc/sysctl.d/...` (which would fail because redirection happens in the user's shell, before sudo) with `sudo tee -a ... > /dev/null`.

2. **Deprecated Proxmox plugin fields** — `iso_storage_pool` and `unmount_iso` are top-level deprecated fields in the current `proxmox-iso` builder; they have been replaced by the `boot_iso { ... }` block. Migrated the post's Proxmox source to the `boot_iso` block (with `iso_url`, `iso_checksum`, `iso_storage_pool`, `unmount`, and `type` inside). The old fields would still work today, but the documented modern API is the block form.

## Review Notes
- The QEMU plugin source `github.com/hashicorp/qemu` and Proxmox plugin source `github.com/hashicorp/proxmox` are both still HashiCorp-maintained and correct.
- The autoinstall YAML structure (with the nested `network: network:` netplan key, `storage.layout.name: lvm`, `identity`, `ssh`, `packages`, `late-commands`) matches the Subiquity autoinstall reference.
- The boot command escape pattern `ds=nocloud-net\\;s=http://...` (which becomes `\;` after HCL2 string parsing) is the widely-used, documented BIOS/GRUB pattern and works for the default (BIOS) boot in the post. Under UEFI/EFI firmware, GRUB can truncate args at unquoted `;` even when backslash-escaped — for UEFI builds, the safer form is the quoted variant: `ds="nocloud-net;seedfrom=http://..."`. Left unchanged since the post targets the standard BIOS boot flow.
- The `qemuargs` block redundantly sets `-m 2048M` and `-smp 2` (already covered by `memory = 2048` and `cpus = 2`). Harmless redundancy — Packer's `qemuargs` overrides matching switches rather than replacing all args, so the build still works.
- The default ISO checksum is a documented Ubuntu 22.04.4 release artifact and the post explicitly tells readers to update it from the Ubuntu download page.
- The HashiCorp apt repository install snippet (GPG key under `/usr/share/keyrings`, signed-by repo entry) matches HashiCorp's current install instructions.
- `format = "raw"` on `local-lvm` storage in the Proxmox `disks` block is correct — LVM-thin only supports raw disks.
- `cloud-init status --wait`, `cloud-init clean --logs`, `truncate -s 0 /etc/machine-id`, and removing `/etc/ssh/ssh_host_*` before templating are all standard, correct template-prep steps.
