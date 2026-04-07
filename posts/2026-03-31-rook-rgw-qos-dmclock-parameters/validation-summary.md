# Validation Summary: How to Set QoS and dmclock Parameters for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS Gateway / RGW)
- dmclock (distributed mClock) QoS scheduler
- Rook (Ceph operator for Kubernetes)
- Kubernetes (ConfigMap, kubectl)

## Sources Consulted
- Ceph source code: `src/common/options/rgw.yaml.in` (canonical config option definitions with defaults and types)
- Ceph source code: `src/rgw/rgw_dmclock.h` (RGW dmclock client_id enum defining request categories: admin, auth, data, metadata)
- Ceph source code: `src/dmclock/src/dmclock_server.h` (dmclock ClientInfo struct confirming reservation/weight/limit parameters and limit=0 behavior)
- Rook documentation on `rook-config-override` ConfigMap: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found
1. **Missing `auth` request category**: The blog only covered three dmclock categories (admin, data, metadata), but Ceph RGW defines four: admin, auth, data, and metadata. The `auth` category covers swift auth and STS requests with options `rgw_dmclock_auth_res`, `rgw_dmclock_auth_wgt`, and `rgw_dmclock_auth_lim`. Added the auth category to both the CLI examples and the Rook ConfigMap snippet.

2. **Incorrect metadata description**: The blog described the metadata category as "Background GC and lifecycle operations." In Ceph's RGW dmclock implementation, the metadata category covers bucket operations and object metadata, not GC/lifecycle. Corrected the comment to "Metadata requests (bucket operations, object metadata)."

3. **Summary mentioned only three categories**: Updated the summary sentence to list all four categories (admin, auth, data, metadata).

## Review Notes
- The dmclock scheduler in Ceph RGW is considered experimental and may require setting `experimental_feature_enabled = dmclock` depending on the Ceph version. The post does not mention this, which could be worth noting in a future update.
- The default value for `rgw_dmclock_metadata_res` is 500 (not 50 as used in the examples), and `rgw_dmclock_metadata_wgt` defaults to 500 (not 200). The post intentionally sets lower values to deprioritize metadata, which is a valid configuration choice, not an error.
- The "Distributed Modified Clock" expansion of dmclock is a common informal interpretation. The original paper is "mClock: Handling Throughput Variability for Hypervisor IO Scheduling" (USENIX OSDI 2010), and "d" stands for "distributed." This is acceptable but not an official expansion.
