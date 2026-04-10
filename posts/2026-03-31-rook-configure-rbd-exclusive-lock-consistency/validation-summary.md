# Validation Summary: How to Configure RBD Exclusive Lock for Consistency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- RBD exclusive lock feature
- Kubernetes PersistentVolumeClaims (RWO access mode)
- Ceph CSI driver
- kubectl CLI

## Sources Consulted
- Ceph RBD man page (Reef): https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph RBD Config Settings: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph RBD Exclusive Locks documentation: https://docs.ceph.com/en/latest/rbd/rbd-exclusive-locks/
- Ceph source code (rbd.yaml.in): https://github.com/ceph/ceph/blob/main/src/common/options/rbd.yaml.in
- Linux kernel RBD krbd map options (lock_timeout added in kernel 4.17, lock_on_read added in kernel 4.9)

## Issues Found

### 1. Invalid `ceph config set` options in Lock Timeout Configuration section
**What was wrong:** The post used `ceph config set client rbd_lock_timeout 30` and `ceph config set client rbd_lock_on_read false`. Neither `rbd_lock_timeout` nor `rbd_lock_on_read` are valid `ceph config set` daemon-level options. These are actually kernel RBD (krbd) device map options named `lock_timeout` and `lock_on_read`, passed via `-o` flags when mapping an image with `rbd device map`.

**What was changed:** Replaced the `ceph config set` commands with the correct `rbd device map -o lock_timeout=30` and `rbd device map -o lock_on_read=0` syntax. Updated the section description to clarify these are per-map kernel options, not global daemon configuration settings. Updated the explanation of `lock_timeout` to accurately describe its behavior (controls how long the client waits to acquire the lock, not how long Ceph waits before considering a client dead).

**Why:** Using the original commands would result in errors since the config options do not exist in Ceph's config framework. The corrected commands use the proper kernel map option syntax.

## Review Notes
- The mention of `csi-attacher` handling lock breaking automatically is a simplification. The actual lock management happens in the Ceph CSI driver's NodeStage/NodePublish path, with the external-attacher sidecar coordinating the detach/attach lifecycle. This is acceptable for a blog post audience.
- The `rbd lock list` output example uses a short illustrative lock ID ("auto 1234"); real auto-generated lock IDs are typically longer hex strings. This is fine for illustration.
- Ceph's dead-client detection for exclusive locks is based on the RADOS watch/notify framework, controlled by OSD-side timeouts (`osd_client_watch_timeout`, default 30s). This is distinct from the `lock_timeout` map option, which controls how long a *new* client waits to acquire a contested lock.
- All other commands (`rbd create`, `rbd feature enable`, `rbd info`, `rbd lock list`, `rbd lock remove`, `rbd status`) use correct syntax.
- The PVC YAML example is correct and uses valid Kubernetes API fields.
