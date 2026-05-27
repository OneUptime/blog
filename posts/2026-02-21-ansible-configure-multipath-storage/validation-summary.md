# Validation Summary: How to Use Ansible to Configure Multipath Storage

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Ansible playbooks and modules
- Linux DM-Multipath
- `/etc/multipath.conf`
- Fibre Channel and iSCSI SAN connectivity
- systemd services

## Sources Consulted
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `community.general.open_iscsi` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/open_iscsi_module.html
- Red Hat Enterprise Linux 7 DM Multipath setup documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/dm_multipath/mpio_setup
- Red Hat Enterprise Linux 10 DM Multipath configuration documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_device_mapper_multipath/modifying-the-dm-multipath-configuration-file
- Ubuntu Server multipath documentation: https://ubuntu.com/server/docs/explanation/intro-to/multipath/
- Ubuntu Server multipath configuration documentation: https://ubuntu.com/server/docs/explanation/multipath/configuring-multipath/
- Debian `multipathd(8)` man page: https://manpages.debian.org/trixie/multipath-tools/multipathd.8.en.html
- Debian `multipath(8)` man page: https://manpages.debian.org/trixie/multipath-tools/multipath.8.en.html
- Dell PowerStore Linux multipath configuration guidance: https://www.dell.com/support/kbdoc/en-us/000220440/io-goes-to-single-node-due-to-missing-mpio-configuration-on-hosts-side

## Issues Found
- The opening explanation stated that duplicate path devices always lead to corruption. Changed this to "can lead" because the risk depends on how those duplicate devices are used.
- The playbooks used `ansible.builtin.systemd`. Updated the examples to `ansible.builtin.systemd_service`, the canonical current Ansible module name; `systemd` remains an alias for compatibility.
- The multipath blacklist comment said it blacklisted all partitions, but the regex blacklists common local, removable, and virtual device classes. Updated the comment to match the configuration.
- The Dell EMC device override grouped PowerStore with the older `DGC` vendor match. Added a separate PowerStore block using Dell's documented `DellEMC` vendor and `PowerStore` product values, and narrowed the `DGC` comment to Unity / VNX family.
- The monitoring playbook defined `min_paths_per_device` but only displayed counts. Added an alert task so the example actually warns when active path counts fall below the configured minimum.
- The path-count checks searched only for the exact text `active ready`, which misses bracketed or otherwise formatted `multipath -ll` output such as `[active][ready]`. Updated the checks to match `active.*ready`.
- The path-count shell command could produce duplicate `0` output when no active paths matched because `grep -c` prints `0` and exits nonzero. Changed the fallback to `true`.
- The path-count shell command only matched aliases beginning with `mpath`, which misses WWID-named devices and explicit aliases. Updated it to parse multipath topology header lines instead.
- The iSCSI example installed only the RHEL package. Added Debian-family installation of `open-iscsi` and gated the RHEL package task with `ansible_os_family == "RedHat"`.

## Review Notes
The local review environment did not have Ansible, multipath, or Ruby/YAML validation tools installed, so command execution was limited to source inspection. The reviewed examples are still intentionally generic; production multipath device stanzas should be checked against the storage vendor's current host connectivity guide for the exact array model and OS version.
