# Validation Summary: How to Fix OSD_NEARFULL Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (OSD management, health checks, pool configuration, compression)
- Rook (CephCluster CRD, Kubernetes-based Ceph orchestration)
- Prometheus (alerting rules with predict_linear)
- Kubernetes (kubectl, pod management)

## Sources Consulted
- Ceph Health Checks Documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Troubleshooting OSDs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph Monitoring a Cluster: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph Pools Documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook CephCluster CRD: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook GitHub - CephCluster CRD docs: https://github.com/rook/rook/blob/master/Documentation/CRDs/Cluster/ceph-cluster-crd.md
- Red Hat ODF - Setting Ceph OSD full thresholds: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/4.17/html/managing_and_allocating_storage_resources/setting-ceph-osd-full-thresholds__rhodf

## Issues Found
- **Incorrect compression verification command**: The post used `ceph osd pool stats <pool-name>` to verify compression savings. This command only shows client I/O rates (read/write ops and bandwidth) and recovery rates — it does not display any compression-related metrics. Changed to `ceph df detail`, which shows per-pool `USED COMPR` (actual compressed size on disk) and `UNDER COMPR` (original uncompressed size) columns, allowing users to evaluate compression effectiveness.

## Review Notes
- The `ceph osd df | sort -k8 -rn` command uses column 8 for sorting, but the actual column position of `%USE` varies by Ceph version (e.g., column 7 in Luminous, column 11 in Quincy/Reef). Users may need to adjust the column number for their version. This is a minor portability concern, not an error.
- The `ceph osd df | awk '{sum+=$NF; count++} END {print "avg:", sum/count "%"}'` command will include header and summary lines in the average calculation, which could skew results slightly. This is acceptable as a rough assessment tool.
- The `ceph osd set-nearfull-ratio` CLI command works at runtime but is not persisted by Rook's operator. The Rook CRD approach (`spec.storage.nearFullRatio`) is the preferred declarative method and is correctly documented in the post.
- All other commands, YAML configurations, Prometheus alert rules, and technical explanations are accurate.
