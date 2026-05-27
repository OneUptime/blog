# Validation Summary: How to Use Ansible to Install Snap Packages

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.general.snap module
- Snap and snapd
- Ubuntu package management
- systemd

## Sources Consulted
- Ansible community.general.snap module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/snap_module.html
- Snap install daemon documentation for Ubuntu: https://snapcraft.io/docs/tutorials/install-the-daemon/ubuntu/
- Snap install daemon documentation for Fedora: https://snapcraft.io/docs/tutorials/install-the-daemon/fedora/
- Snap update management documentation: https://snapcraft.io/docs/how-to-guides/manage-snaps/manage-updates/
- Snap confinement documentation: https://documentation.ubuntu.com/security/security-features/privilege-restriction/snap-confinement/
- Snap channels documentation: https://snapcraft.io/docs/channels/
- Snap install modes documentation: https://canonical-snap.readthedocs-hosted.com/explanation/snap-development/install-modes/
- Local `snap help` output from snapd 2.75.2 for `install`, `refresh`, `wait`, `set`, and `connect`.

## Issues Found
- The introduction said example applications such as VS Code and Slack are distributed primarily as snaps. These applications are available as snaps, but they are also distributed through other official package formats, so the wording was changed to avoid overstating snap as the primary distribution method.
- The introduction described all snaps as sandboxed. Classic snaps are intentionally more permissive, so the wording was changed to say snaps usually run in a sandboxed environment.
- The multiple-snaps section showed `classic: true` with a list of snap names. The official Ansible documentation states that `classic` can only be specified when a task involves a single snap, so the example was changed to loop over classic snaps one at a time.
- The snap configuration section said `community.general.snap` does not directly support `snap set`. Current module documentation includes the `options` parameter for snap configuration, so the example was changed to use `options`.
- The offline installation section said `--dangerous` is needed because the snap is not from the store and therefore is not signed. Snap assertions can verify store signatures for downloaded snaps; `--dangerous` is needed when those assertions are not pre-acknowledged. The explanation was corrected.

## Review Notes
Some command-based examples intentionally use `changed_when: true`, so they are operationally valid but not fully idempotent. Future improvements could register command output or use module parameters where available.
