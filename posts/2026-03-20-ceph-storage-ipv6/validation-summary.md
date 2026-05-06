# Validation Summary: How to Configure Ceph Storage with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph
- cephadm
- IPv6
- Ceph Monitors (MON)
- Ceph OSDs
- RADOS Gateway (RGW)
- CephFS
- RBD
- ip6tables

## Sources Consulted
- Ceph Documentation: Configuring Ceph - https://docs.ceph.com/en/reef/rados/configuration/ceph-conf/
- Ceph Documentation: Network Configuration Reference - https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph Documentation: Using Cephadm to Deploy a New Ceph Cluster - https://docs.ceph.com/en/latest/cephadm/install/
- Ceph Documentation: MON Service - https://docs.ceph.com/en/latest/cephadm/services/mon/
- Ceph Documentation: RGW Service - https://docs.ceph.com/en/latest/cephadm/services/rgw/
- Ceph Documentation: HTTP Frontends - https://docs.ceph.com/en/latest/radosgw/frontends/
- Ceph Documentation: Mount CephFS using Kernel Driver - https://docs.ceph.com/en/quincy/cephfs/mount-using-kernel-driver/
- Ceph Documentation: mount.ceph man page - https://docs.ceph.com/en/reef/man/8/mount.ceph/
- Ceph Documentation: Mount CephFS using FUSE - https://docs.ceph.com/en/latest/cephfs/mount-using-fuse
- Ceph Documentation: Troubleshooting Monitors - https://docs.ceph.com/en/quincy/rados/troubleshooting/troubleshooting-mon/

## Issues Found
- The post originally described `ceph.conf` as the cephadm configuration path for runtime settings. I corrected this to reflect that cephadm-managed daemons use Ceph's monitor configuration database for settings, with `ceph.conf` primarily handling bootstrap settings.
- The original IPv6 config example used generic `[mon]` and `[osd]` address overrides that were misleading for multi-daemon deployments, and it included `fd00:ceph::20`, which is not a valid IPv6 address. I replaced that with `public_network` and `cluster_network` CIDRs plus a per-daemon OSD override using a valid ULA prefix.
- The monitor example used `public_addr = 2001:db8::10:6789`, which incorrectly embedded a port in `public_addr` and produced an invalid IPv6 literal. I changed `public_addr` to the plain IPv6 address and left `mon_addr` to carry the port.
- The RGW section mixed cephadm deployment with `systemctl` service management. I updated it to use `ceph config set client.rgw.rgw1 rgw_frontends ...` and `ceph orch apply rgw ...`, which matches cephadm's documented workflow.
- The RGW test command used an unverified `s3cmd` example. I replaced it with a direct IPv6 `curl` check against the RGW endpoint so the validation command is unambiguous and does not depend on client-specific S3 endpoint syntax.
- The monitor verification command used a hard-coded admin socket path that is fragile in cephadm-managed environments. I replaced it with `ceph tell mon.ceph-mon1 mon_status`, which is the documented monitor query pattern.
- The firewall example used `6800:7300` for daemon ports and did not account for separate public and cluster networks. I corrected the port range to `6800:7568` and split the rules across the public IPv6 network and the IPv6 cluster network.
- The bootstrap section now includes `--cluster-network fd00:ce01::/64` so the deployment example matches the separate cluster-network configuration shown elsewhere in the post.

## Review Notes
- The CephFS kernel mount examples use the older monitor-list device string syntax. Current Ceph documentation still describes that syntax as backward-compatible, so it is technically acceptable, but newer deployments may prefer the newer `name@.fs_name=/` style.
- For cephadm-managed RGW HTTPS, current Ceph documentation also documents certificate-manager-based workflows using RGW service specs. The post's Beast frontend SSL example remains valid, but it is not the only current deployment pattern.
