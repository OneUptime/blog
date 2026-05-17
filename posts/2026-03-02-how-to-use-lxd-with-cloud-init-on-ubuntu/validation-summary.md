# Validation Summary: How to Use LXD with cloud-init on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- LXD / LXC (container and VM management)
- cloud-init (instance initialization)
- Ubuntu 24.04 cloud images
- LXD profiles and device configuration
- Bash scripting for orchestration
- YAML / cloud-config format

## Sources Consulted
- LXD cloud-init documentation: https://documentation.ubuntu.com/lxd/latest/cloud-init/
- LXD instance creation: https://documentation.ubuntu.com/lxd/latest/howto/instances_create/
- cloud-init CLI reference: https://docs.cloud-init.io/en/latest/reference/cli.html
- cloud-init re-run howto: https://docs.cloud-init.io/en/latest/howto/rerun_cloud_init.html
- cloud-init boot stages: https://docs.cloud-init.io/en/latest/explanation/boot.html
- Ubuntu PEP 668 / externally-managed-environment behavior on 24.04

## Issues Found

1. **`pip3 install flask` would fail on Ubuntu 24.04 due to PEP 668** — In the `provision-cluster.sh` example, the cloud-init runcmd executed `pip3 install flask` against the system Python. Ubuntu 24.04 marks the system Python interpreter as externally-managed (PEP 668), so this command fails with `error: externally-managed-environment`. Fix: replaced `python3-pip` in `packages` with `python3-flask` (available in the Ubuntu 24.04 archive) and removed the `pip3 install flask` runcmd line. This installs Flask via apt, which is the right pattern for system-level provisioning on modern Ubuntu and avoids teaching `--break-system-packages` as a default.

2. **Missing `cloud-init init --local` step in the manual re-run sequence** — The "Re-running cloud-init" section showed `cloud-init clean --logs` followed by `cloud-init init`, `cloud-init modules --mode config`, `cloud-init modules --mode final`. The canonical cloud-init boot sequence has four stages; `cloud-init init --local` (the Local stage, where the LXD datasource is discovered and user-data is fetched) is run before the network-up `cloud-init init` (Network stage). Omitting it can cause the datasource not to be picked up on re-run. Fix: added the `cloud-init init --local` line as the second step in the bash block.

## Review Notes

- The post uses the legacy `user.user-data` config key throughout. This is still supported by LXD (per the official docs both `user.*` and `cloud-init.*` keys are valid), but `cloud-init.user-data` is the modern preferred form for current Ubuntu cloud images (LTS 22.04+). Not changed — the existing syntax still works correctly and the post is internally consistent.
- The "Passing Secrets via cloud-init" example uses an unquoted heredoc (`<<EOF` rather than `<<'EOF'`) intentionally so that `${API_KEY}` is interpolated by the host shell. This is correct for the stated purpose; flagging only as a reminder that anyone reading this should be aware of the shell-expansion subtlety. The post already notes the visibility caveat via `lxc config show`.
- The `cloud-init query userdata` command returns redacted output for non-root users; inside `lxc exec` it runs as root by default, so the example works as written.
- `cloud-init init --all-stages` is a newer single-command replacement for the four-step manual sequence; the post's four-step approach remains valid and is more portable across cloud-init versions.
- The `lxc init ubuntu:24.04 myvm --vm` syntax is correct — the `ubuntu:` remote serves both container and VM image variants, and LXD selects the VM variant when `--vm` is passed.
