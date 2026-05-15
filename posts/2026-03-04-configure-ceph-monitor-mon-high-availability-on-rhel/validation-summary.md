# Validation Summary: How to Configure Ceph Monitor (MON) High Availability on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ceph Storage
- Ceph Monitor daemons
- cephadm
- firewalld
- Ceph quorum and monitor maps

## Sources Consulted
- Ceph MON Service documentation: https://docs.ceph.com/en/pacific/cephadm/services/mon/
- Ceph common monitor settings documentation: https://docs.ceph.com/en/latest/rados/configuration/common/
- Ceph monitoring a cluster documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph control commands documentation: https://docs.ceph.com/en/pacific/rados/operations/control/
- Red Hat Ceph Storage 6 firewall ports documentation: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/6/html/configuration_guide/config-ceph-firewall-ports_conf
- Red Hat Ceph Storage 4 Ceph Monitor firewall settings documentation: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/configuration_guide/ceph-network-configuration

## Issues Found
- The manual monitor placement example used `ceph orch daemon add mon node2:192.168.1.11` without first disabling automated monitor placement. Ceph's cephadm documentation instructs administrators to run `ceph orch apply mon --unmanaged` before explicitly deploying monitors by host/IP, so this command was added.
- The monitor network section said monitors should communicate on a dedicated network if possible. Ceph monitors operate on the public network, and cephadm uses `ceph config set mon public_network <cidr>` to designate the monitor public subnet. The wording was corrected to avoid implying that monitors should use a separate Ceph cluster network.

## Review Notes
The monitor status, quorum, `ceph orch apply mon`, monitor removal, `public_network`, and firewall port examples are consistent with current Ceph and Red Hat Ceph Storage documentation. The post does not specify a Red Hat Ceph Storage major version; cephadm behavior and command syntax can vary slightly across supported releases, so future updates could mention the tested RHCS/Ceph release.
