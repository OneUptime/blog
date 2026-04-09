# Validation Summary: How to Configure Health Check Settings for OSDs in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes
- CephCluster CRD (`ceph.rook.io/v1`)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook source code: `pkg/apis/ceph.rook.io/v1/types.go` (HealthCheckSpec struct definition)
- Rook source code: `pkg/operator/ceph/cluster/osd/health.go` (OSD health checker implementation)
- Rook source code: `pkg/operator/ceph/cluster/mon/health.go` (Mon health checker — for comparison of `timeout` usage)
- Red Hat Ceph Storage configuration documentation (for `mon_osd_report_timeout` default)

## Issues Found

### 1. `timeout` field under `osd` is not used by the Rook operator (MAJOR)
**What was wrong:** The post included `timeout: 600s` (and other values) in all OSD health check YAML examples and described it as controlling "how long an OSD can remain unhealthy before operator-level remediation begins." While the `timeout` field exists in the `HealthCheckSpec` Go struct and is accepted in YAML without validation errors, the Rook OSD health checker code (`osd/health.go`) does **not** read or act on it. The `timeout` field is only consumed by the **monitor (mon)** health checker. Setting `timeout` under `osd` has zero effect.

**What was changed:** Removed `timeout` from all YAML examples. Updated text to clarify that `interval` and `disabled` are the only effective fields for OSD health checks. Added a note that `timeout` is only used by the `mon` health checker.

### 2. Incorrect description of operator remediation behavior (MAJOR)
**What was wrong:** The post claimed the operator "watches OSD pod health and can evict or replace OSDs that remain unhealthy" and that the timeout "signals that the OSD pod itself is unhealthy and may need to be rescheduled." This is incorrect. The operator polls `ceph osd dump`, identifies OSDs that are both DOWN and OUT, and — only if `removeOSDsIfOutAndSafeToRemove` is enabled — deletes the OSD Deployment after confirming the OSD is safe to destroy and a grace period has elapsed.

**What was changed:** Corrected the description to explain the actual behavior: the operator polls OSD status and can remove OSD deployments if `removeOSDsIfOutAndSafeToRemove` is enabled, once Ceph confirms they are safe to destroy.

### 3. Invalid advice to align Rook timeout with Ceph's `mon_osd_report_timeout` (MODERATE)
**What was wrong:** The post advised aligning the (non-functional) Rook OSD `timeout` with Ceph's `mon_osd_report_timeout`. Since the Rook OSD `timeout` field is unused, this advice was meaningless.

**What was changed:** Replaced the alignment advice with accurate guidance about the default 60-second polling interval being sufficient for most production clusters.

### 4. `mon_osd_report_timeout` information was correct
The claim that `mon_osd_report_timeout` defaults to 900 seconds is accurate and was retained.

### 5. kubectl commands were correct
All three monitoring commands (`ceph osd stat`, `ceph osd tree | grep`, and pod restart count query) are syntactically correct and use valid labels/selectors.

### 6. Disabling health checks during maintenance was correct
The `disabled: true` configuration is a valid and documented approach.

## Review Notes
- The `removeOSDsIfOutAndSafeToRemove` field is an important part of Rook's OSD lifecycle management but was not mentioned in the original post. It was added where relevant to correct the description of operator behavior.
- The `interval` field's default value of 60 seconds is not explicitly documented in the CRD docs but is set in the Go source code. The post now mentions this default.
- Future versions of Rook may change how the `timeout` field is handled for OSDs. If Rook adds support for an OSD-specific timeout in the future, this post should be revisited.
