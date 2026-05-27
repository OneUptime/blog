# Validation Summary: How to Use Ansible to Set Up iSCSI Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- iSCSI
- Linux LIO and targetcli
- Open-iSCSI
- Device Mapper Multipath
- LVM
- XFS and Linux filesystems
- firewalld

## Sources Consulted
- Ansible community.general.open_iscsi module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/open_iscsi_module.html
- Ansible community.general.lvol module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/lvol_module.html
- Ansible community.general.filesystem module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/filesystem_module.html
- Ansible ansible.posix.mount module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible ansible.posix.firewalld module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- RFC 7143, Internet Small Computer System Interface (iSCSI) Protocol: https://datatracker.ietf.org/doc/rfc7143/
- Red Hat Enterprise Linux storage documentation for iSCSI target configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_storage_devices/configuring-an-iscsi-target
- Red Hat Enterprise Linux storage documentation for iSCSI initiator configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_storage_devices/configuring-an-iscsi-initiator_managing-storage-devices
- Debian python3-rtslib-fb systemd service source: https://sources.debian.org/src/python-rtslib-fb/2.1.76-3/debian/python3-rtslib-fb.rtslib-fb-targetctl.service/
- Ubuntu iscsid man page: https://manpages.ubuntu.com/manpages/noble/man8/iscsid.8.html
- Ubuntu multipath.conf man page: https://manpages.ubuntu.com/manpages/jammy/en/man5/multipath.conf.5.html
- targetcli-fb man page: https://manpages.opensuse.org/Leap-16.0/targetcli-fb-common/targetcli.8.en.html

## Issues Found
- The target playbook created LVM logical volumes named `lun0` and `lun1`, but then exported `/dev/vg_iscsi/lv_iscsi_0` and `/dev/vg_iscsi/lv_iscsi_1`. I changed the logical volume names to `lv_iscsi_0` and `lv_iscsi_1` so the created devices match the exported backstores.
- The target service name was hard-coded to Debian's `rtslib-fb-targetctl`, while RHEL uses `target`. I added an OS-family-based `iscsi_target_service` variable and removed the suppressed failure so service startup problems are visible.
- The initiator playbook passed `10.0.0.50:3260` as `portal` to `community.general.open_iscsi`, but the module documents `portal` and `port` separately. I split this into `iscsi_target_portal` and `iscsi_target_port` and passed both to discovery and login tasks.
- The initiator service loop tried to start `open-iscsi` on every OS, which is not the RHEL service name. I added an OS-family-based service list so Debian uses `iscsid` and `open-iscsi`, while RHEL uses `iscsid`.
- The login task configured CHAP only through `iscsid.conf`. I added `node_user` and `node_pass` to the `community.general.open_iscsi` login task and marked the task `no_log` so credentials are applied to the node through the module and not printed.
- The multipath playbook installed `multipath-tools` for every OS, but RHEL uses `device-mapper-multipath`. I added an OS-family-based package variable.
- The architecture diagram used LUN device names that did not match the target playbook. I updated the diagram to match the corrected logical volume paths.
- The jumbo frame guidance was too absolute. I changed it to recommend jumbo frames only when the full iSCSI path supports the same MTU and after validation.
- The CHAP warning overstated access behavior by ignoring target access rules. I clarified that unauthenticated access depends on reachability and target access rules.

## Review Notes
The examples are technically valid as tutorial playbooks, but production environments should still prefer stable device identifiers such as WWIDs or filesystem UUIDs over friendly multipath names like `/dev/mapper/mpatha`, and should tune multipath policies to the actual storage array and distribution defaults.
