# Validation Summary: How to Troubleshoot Ceph OSD Flapping Due to Network Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph OSDs (Object Storage Daemons)
- Kubernetes (kubectl, pod debugging, ConfigMaps)
- Linux networking (ip, ping, netstat)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook network configuration documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Ceph OSD configuration reference (osd_heartbeat_grace, osd_heartbeat_interval): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook ConfigMap override documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found

1. **CephCluster network config used incorrect `selectors` field with host provider**: The original YAML specified `provider: host` with `selectors` containing CIDR ranges (`public: "10.0.0.0/24"`, `cluster: "192.168.1.0/24"`). The `selectors` field is designed for the `multus` network provider and expects NetworkAttachmentDefinition names, not CIDR ranges. With `provider: host`, public and cluster networks should be configured via the `rook-config-override` ConfigMap using `public_network` and `cluster_network` Ceph settings under `[global]`. Fixed by replacing the incorrect CephCluster spec with a valid host networking example and adding a separate ConfigMap snippet for network CIDR configuration.

2. **ConfigMap heartbeat interval inconsistent with bash command**: The bash command example set `osd_heartbeat_interval` to 10, but the ConfigMap example below it set the same parameter to 6 (the default value). This was inconsistent and would confuse readers following along. Fixed by changing the ConfigMap value to 10 to match.

## Review Notes
- The `osd_heartbeat_grace` default of 20 seconds and `osd_heartbeat_interval` default of 6 seconds are correct per Ceph documentation.
- The ping MTU test using `-s 8972` is correct: 8972 bytes payload + 20 bytes IP header + 8 bytes ICMP header = 9000 bytes, which properly tests a 9000-byte MTU.
- The `rook-config-override` ConfigMap is the correct Rook mechanism for persistent Ceph configuration overrides.
- The OSD pod label selector `app=rook-ceph-osd` is correct for Rook-managed OSD pods.
