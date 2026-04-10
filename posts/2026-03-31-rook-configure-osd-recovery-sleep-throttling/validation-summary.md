# Validation Summary: How to Configure osd_recovery_sleep for Throttling

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (OSD recovery throttling)
- Rook (CephCluster CRD configuration)
- Kubernetes (kubectl toolbox access)

## Sources Consulted
- Ceph source code — `src/common/options/osd.yaml.in` (main branch): https://github.com/ceph/ceph/blob/main/src/common/options/osd.yaml.in
- Ceph OSD Config Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph mClock Config Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/mclock-config-ref/
- Rook CephCluster CRD types (`ClusterSpec.CephConfig`): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook CephCluster CRD documentation: https://github.com/rook/rook/blob/master/Documentation/CRDs/Cluster/ceph-cluster-crd.md
- Rook example cluster YAML: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml

## Issues Found
No technical issues found.

## Review Notes
- **mClock scheduler caveat**: Starting from Ceph Quincy (and continuing through Reef and Squid), the default OSD scheduler is mClock rather than the legacy WPQ (Weighted Priority Queue). When mClock is active, `osd_recovery_sleep_*` parameters are ignored because mClock handles recovery throttling through its own QoS mechanism. The blog post does not mention this, which could mislead readers on modern Ceph clusters. A future update should note that these settings only apply when using the `wpq` scheduler (`osd_op_queue = wpq`), or explain how to check which scheduler is active.
- The description of `osd_recovery_sleep` as a "global setting for all media" is a reasonable simplification. More precisely, it acts as an override: when set to a non-zero value it overrides the media-specific variants; when left at 0 (default), the media-specific parameters take effect based on OSD device type.
- All default values verified against Ceph source code: `osd_recovery_sleep` = 0, `osd_recovery_sleep_hdd` = 0.1, `osd_recovery_sleep_ssd` = 0, `osd_recovery_sleep_hybrid` = 0.025.
- The Rook `spec.cephConfig` YAML structure is correct. The CRD defines it as `map[string]map[string]string`, and `osd` is a valid Ceph config section name passed through to the Mon config store.
- The `injectargs` syntax correctly uses dashes (`--osd-recovery-sleep-hdd`) rather than underscores, which is the expected format for `injectargs`.
