# Validation Summary: How to Configure Ceph RGW for High Concurrent Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW) with Beast frontend
- Rook Ceph Operator (CephObjectStore CRD)
- Kubernetes (Services, Ingress, resource limits)
- NGINX Ingress Controller
- Linux kernel TCP tuning (sysctl)
- Prometheus monitoring for Ceph

## Sources Consulted
- Ceph HTTP Frontends documentation — https://docs.ceph.com/en/latest/radosgw/frontends/
- Ceph Object Gateway Config Reference — https://docs.ceph.com/en/reef/radosgw/config-ref/
- Rook Ceph Object Storage documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Red Hat Ceph Storage Object Gateway Configuration — https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/object_gateway_configuration_and_administration_guide/rgw-configuration-rgw
- Ceph Tuning for All Flash Deployments — https://tracker.ceph.com/projects/ceph/wiki/Tuning_for_All_Flash_Deployments

## Issues Found

1. **`num_threads` is not a valid Beast frontend parameter (CRITICAL)**
   - **What was wrong:** The post used `num_threads=2048` inside the `rgw_frontends` Beast configuration string. `num_threads` is a Civetweb parameter, not Beast. Beast uses an asynchronous event-driven model (Boost.Beast/Asio) and does not accept `num_threads`.
   - **What was changed:** Removed `num_threads=2048` from the `rgw_frontends` string. Added a separate `ceph config set client.rgw rgw_thread_pool_size 2048` command, which is the correct way to configure Beast's worker thread pool.
   - **Why:** Using `num_threads` with Beast would be silently ignored, leaving the thread pool at its default size (512), defeating the purpose of the tuning.

2. **`rgw_num_rados_handles` is deprecated and removed (CRITICAL)**
   - **What was wrong:** The post set `rgw_num_rados_handles 32`. This configuration option was removed in modern Ceph versions (Nautilus and later).
   - **What was changed:** Removed the `rgw_num_rados_handles` command entirely. Renamed the section from "RADOS Handle Pool" to "RADOS Objecter Tuning" and updated the description to focus on the `objecter_inflight_ops` and `objecter_inflight_op_bytes` settings which are the correct tuning parameters.
   - **Why:** Setting a removed config option would produce warnings or errors. The objecter settings are what actually control RADOS operation concurrency in modern Ceph.

3. **`spec.gateway.type: s3` is not a valid CephObjectStore CRD field (MODERATE)**
   - **What was wrong:** The CephObjectStore YAML included `type: s3` under `spec.gateway`. The Rook CephObjectStore CRD does not have a `type` field — RGW inherently provides S3-compatible and optionally Swift-compatible APIs.
   - **What was changed:** Removed the `type: s3` line from the CephObjectStore spec.
   - **Why:** Including an invalid field could cause validation errors or be silently ignored depending on the Rook version.

4. **Service `targetPort: 8080` mismatches gateway port (MODERATE)**
   - **What was wrong:** The Kubernetes Service had `targetPort: 8080` but the CephObjectStore gateway was configured with `port: 80`. These must match for traffic to be routed correctly.
   - **What was changed:** Changed `targetPort: 8080` to `targetPort: 80`.
   - **Why:** The port mismatch would cause the Service to route traffic to a port where nothing is listening, breaking connectivity entirely.

5. **Incorrect RGW pod label selector `rgw: my-store` (MINOR)**
   - **What was wrong:** The Service selector used `rgw: my-store`. Rook labels RGW pods with `rook_object_store: <store-name>`, not `rgw: <store-name>`.
   - **What was changed:** Changed `rgw: my-store` to `rook_object_store: my-store`.
   - **Why:** The incorrect label selector would cause the Service to match zero pods, making it non-functional.

## Review Notes
- The `objecter_inflight_ops` (65536) and `objecter_inflight_op_bytes` (536870912 = 512MB) values are aggressive but reasonable for high-concurrency deployments. For all-flash clusters, Ceph documentation recommends 10x defaults (10240 ops, ~1GB bytes).
- The `rgw_thread_pool_size` of 2048 is very high. The default is 512. For most deployments, values between 512-1024 are sufficient. 2048 may be appropriate for very high connection counts but will consume significant memory.
- The Prometheus metrics `ceph_rgw_req` and `ceph_rgw_failed_req` are correct and standard metrics from the Ceph manager Prometheus module.
- The sysctl TCP tuning commands are correct but would need to be persisted (e.g., via `/etc/sysctl.d/` configuration files) to survive reboots — the post correctly notes using a DaemonSet or node configuration for this.
- The NGINX Ingress annotations used are valid and appropriate for S3-compatible storage (large body size, extended timeouts, keepalive connections).
