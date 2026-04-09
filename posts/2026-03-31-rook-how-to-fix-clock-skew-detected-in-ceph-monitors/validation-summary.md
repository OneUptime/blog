# Validation Summary: How to Fix 'clock skew detected' in Ceph Monitors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system, monitor consensus via Paxos)
- Rook (Ceph operator for Kubernetes)
- systemd-timesyncd (NTP client for Debian/Ubuntu)
- chrony (NTP client for RHEL/CentOS/Rocky Linux)
- Kubernetes (kubectl commands for Rook toolbox)
- NTP (Network Time Protocol)

## Sources Consulted
- Ceph Troubleshooting Monitors documentation (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/)
- Ceph Configuration Reference (https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/)
- Rook Ceph Configuration documentation (https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-configuration/)
- Rook CephCluster CRD specification (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook ceph-config-updates design document (https://github.com/rook/rook/blob/master/design/ceph/ceph-config-updates.md)
- AWS EC2 NTP Configuration documentation (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-ec2-ntp.html)

## Issues Found
No technical issues found.

## Review Notes
- The `ceph tell mon.* injectargs` command is functional but considered a legacy approach. The modern preferred method for persistent CLI changes is `ceph config set mon mon_clock_drift_allowed 0.2`. However, the blog correctly labels `injectargs` as a non-permanent change and provides the `spec.cephConfig` CRD approach for permanent configuration, so this is not an error — just an alternative the reader could also use.
- The `ntpdate` tool used in Step 4 is deprecated on many modern Linux distributions in favor of `timedatectl` or `chronyc makestep`. It still works when installed, and the blog already provides the `chronyc makestep` alternative, so this is acceptable.
- The chrony config file path is shown as `/etc/chrony.conf`, which is correct for RHEL/CentOS/Rocky Linux. On Debian/Ubuntu systems, it may be located at `/etc/chrony/chrony.conf`, but since the blog specifies chrony in the RHEL context this is not an issue.
