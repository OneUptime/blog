# Validation Summary: How to Use Subiquity to Automate Ubuntu Server Deployments

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Subiquity (Ubuntu Server installer)
- Autoinstall YAML configuration
- cloud-init (NoCloud datasource)
- curtin (post-install command runner)
- Netplan (network configuration)
- LVM and LUKS (storage layouts)
- QEMU/KVM and virt-install (VM testing)
- PXE boot with GRUB
- yq (YAML processor)

## Sources Consulted
- Subiquity autoinstall reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- Subiquity autoinstall validation how-to: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/autoinstall-validation.html
- Subiquity autoinstall JSON schema reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-schema.html
- Subiquity `validate-autoinstall-user-data.py` script (canonical/subiquity GitHub repo)
- virt-install(1) man page (Ubuntu Noble): https://manpages.ubuntu.com/manpages/noble/man1/virt-install.1.html
- cloud-init NoCloud datasource documentation
- PyPI API check confirming `curtin` is not published on PyPI (https://pypi.org/pypi/curtin/json returns 404)
- mikefarah/yq v4 CLI documentation

## Issues Found
1. **Incorrect curtin installation via pip and bogus schema command.** The "Validating Your Autoinstall YAML" section instructed `pip3 install curtin` and then `curtin schema --schema autoinstall user-data`. Curtin is not published on PyPI (verified — `https://pypi.org/pypi/curtin/json` returns "Not Found"), and curtin's `schema` subcommand does not have an autoinstall schema validator. The canonical autoinstall validation tool is Subiquity's `validate-autoinstall-user-data.py` script. Replaced the broken commands with a `git clone` of the Subiquity repo plus the official validator invocation.

2. **Incorrect `yq` invocation.** `yq eval user-data` is wrong for mikefarah/yq v4 (the version shipped by Ubuntu apt): `yq eval` requires an expression argument, and passing `user-data` as the first arg makes yq try to evaluate the string "user-data" as an expression rather than parse the file. Changed to `yq . user-data`, which correctly prints/validates the file.

3. **Redundant/conflicting `--cdrom` and `--location` in virt-install.** The original `virt-install` example passed both `--cdrom ubuntu-24.04-live-server-amd64.iso` and `--location ubuntu-24.04-live-server-amd64.iso,kernel=casper/vmlinuz,initrd=casper/initrd`. According to the virt-install man page, `--location` is the option that supports `--extra-args` (required to pass autoinstall kernel parameters) and already handles using the ISO as the install source. Combining `--cdrom` with `--location` is contradictory and can cause virt-install to fail or behave unpredictably. Removed the `--cdrom` argument and updated the inline comment to explain what `--location` does.

## Review Notes
- The `late-commands` examples use `curtin in-target --target=/target -- <cmd>`. The official Subiquity reference now prefers the shorter `curtin in-target -- <cmd>` form (curtin infers `/target`), but the explicit form is still valid and accepted, so no change was made.
- `mkfs.vfat -n CIDATA` is correct: the cloud-init NoCloud datasource accepts both `cidata` and `CIDATA` labels, and FAT auto-uppercases labels.
- The `apt install yq` package on modern Ubuntu (22.04+) installs mikefarah/yq (the Go implementation), which matches the syntax used in the updated example.
- Python's `crypt` module (used in the password-generation example) was deprecated in 3.11 and removed in 3.13. The `openssl passwd -6` command remains the more portable recommendation; the crypt example will only work on systems with Python < 3.13.
- Subiquity autoinstall configurations have evolved between Ubuntu 22.04 (autoinstall version 1) and 24.04 (which introduced interactive sections and a partial v2 schema). All examples in the post use version 1 features, which remain supported on 24.04.
- The PXE boot example uses an `ip=dhcp` and `url=` parameter scheme that depends on a specific casper boot flow; users on different Ubuntu point releases may need to adjust the kernel parameters.
