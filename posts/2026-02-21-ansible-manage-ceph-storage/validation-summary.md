# Validation Summary: How to Use Ansible to Manage Ceph Storage

## Status
validated

## Post Type
Technical tutorial / infrastructure guide

## Technologies Covered
- Ansible
- Ceph
- Ceph monitors, managers, OSDs, MDS, RGW, and CephFS
- Ceph RPM repositories
- ceph-authtool, monmaptool, ceph-mon, ceph-volume, and ceph CLI
- systemd

## Sources Consulted
- Ceph manual deployment documentation: https://docs.ceph.com/en/latest/install/manual-deployment/
- Ceph package installation documentation: https://docs.ceph.com/en/latest/install/get-packages/
- Ceph installation methods and ceph-ansible notes: https://docs.ceph.com/en/squid/install/
- cephadm documentation: https://docs.ceph.com/en/squid/cephadm/
- cephadm-ansible documentation: https://docs.ceph.com/projects/cephadm-ansible/en/latest/
- Ceph release index: https://docs.ceph.com/en/latest/releases/
- ceph-volume manual page: https://docs.ceph.com/en/latest/man/8/ceph-volume/
- ceph CLI manual page: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph OSD troubleshooting documentation: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ansible builtin yum_repository module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible builtin yum module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible builtin command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible playbook conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html

## Issues Found
- The post described ceph-ansible as the primary official Ansible path. Updated the wording to reflect current Ceph guidance: cephadm is the main lifecycle manager, cephadm-ansible supports cephadm workflows, and ceph-ansible remains widely deployed but lacks newer orchestrator integration.
- The package example used `reef` as the current stable release. Updated the variable to `tentacle` with wording that avoids a time-sensitive "current stable" claim.
- The RHEL package playbook added only the architecture-specific Ceph RPM repository and then used `yum` tasks without consistently limiting them to RHEL-family systems. Added the noarch repository and guarded all yum tasks with `ansible_os_family == "RedHat"`.
- The package playbook included inventory groups for MDS and RGW nodes but did not install `ceph-mds` or `ceph-radosgw`. Added role-specific package tasks for those groups.
- The monitor bootstrap example created a monmap containing only the first monitor because the loop skipped every other item. Changed the `monmaptool` command to include every host in `groups['mons']`.
- The monitor bootstrap omitted the `client.bootstrap-osd` keyring required by the documented short-form `ceph-volume lvm create` OSD workflow. Added creation of the bootstrap OSD keyring and import into the monitor keyring.
- The OSD deployment example said it copied the admin keyring but only copied `ceph.conf`. Updated the example to copy the bootstrap OSD keyring to `/var/lib/ceph/bootstrap-osd/ceph.keyring`.
- The OSD description said each OSD manages one disk. Narrowed this to the example, because OSDs can also be backed by logical volumes or other supported device layouts.
- The OSD drain playbook referenced an undefined `osd_host` variable. Added an explicit example variable.
- The OSD drain playbook waited for `HEALTH_WARN`, which could succeed before rebalancing finished. Replaced that check with `ceph osd safe-to-destroy osd.<id>` and an Ansible retry loop.

## Review Notes
The examples remain simplified and manually managed. For new production clusters, Ceph's current documentation generally favors cephadm-managed deployments, with Ansible used for host preparation or supporting workflows.
