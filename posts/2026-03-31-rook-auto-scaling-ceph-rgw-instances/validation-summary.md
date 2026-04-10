# Validation Summary: How to Set Up Auto-Scaling for Ceph RGW Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Kubernetes Services (LoadBalancer)
- Prometheus metrics and Prometheus adapter
- PromQL

## Sources Consulted
- Rook RGW source code: `pkg/operator/ceph/object/objectstore.go` — label definitions (`labelsForRgw()`, `getLabels()`) https://github.com/rook/rook/blob/master/pkg/operator/ceph/object/objectstore.go
- Rook RGW source code: `pkg/operator/ceph/object/spec.go` — Service and Deployment spec generation https://github.com/rook/rook/blob/master/pkg/operator/ceph/object/spec.go
- Rook RGW source code: `pkg/operator/ceph/object/config.go` — internal port constants (`rgwPortInternalPort = 8080`) https://github.com/rook/rook/blob/master/pkg/operator/ceph/object/config.go
- Rook PR #5113: Separate service/container ports for SDN deployments https://github.com/rook/rook/pull/5113
- Rook GitHub Issue #10001: HPA vs Rook operator reconciliation conflict https://github.com/rook/rook/issues/10001
- Ceph PR #21383: Implementation of `ceph_rgw_metadata` metric https://github.com/ceph/ceph/pull/21383
- Ceph RGW Metrics Documentation https://docs.ceph.com/en/latest/radosgw/metrics/
- Kubernetes HPA v2 API documentation https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

## Issues Found

### 1. Incorrect description of `ceph_rgw_metadata` metric
- **What was wrong:** The PromQL section labeled `ceph_rgw_metadata{type="rgw"}` as showing "Active connections." This is incorrect — `ceph_rgw_metadata` is an info-style gauge (always value 1) that exposes RGW daemon identity labels (hostname, ceph_version, ceph_daemon). It does not track active connections. Additionally, `type` is not a standard label on this metric.
- **What was changed:** Updated the comment from "Active connections" to "RGW daemon metadata (identity and version info)" and removed the incorrect `{type="rgw"}` selector.
- **Why:** The original description would mislead readers into thinking they could monitor connection counts with this metric, when it actually serves as a label-join target for PromQL queries.

### 2. Missing clarification that `ceph_rgw_qps` is not a built-in metric
- **What was wrong:** The custom metrics section used `ceph_rgw_qps` as an external metric name without noting it must be created by the user. This metric does not exist in Ceph's built-in Prometheus metrics. Standard Ceph RGW metrics include `ceph_rgw_req`, `ceph_rgw_get`, `ceph_rgw_put`, etc., but not `ceph_rgw_qps`.
- **What was changed:** Added a sentence clarifying that `ceph_rgw_qps` requires a Prometheus recording rule (e.g., `rate(ceph_rgw_req[5m])`) exposed through the Prometheus adapter.
- **Why:** Without this note, readers would look for a non-existent built-in metric and be confused when it's not available.

## Review Notes

### HPA vs Rook Operator Reconciliation Conflict
The most significant operational caveat not mentioned in the post: Rook's operator periodically reconciles the CephObjectStore, resetting the RGW Deployment replica count back to `gateway.instances` (in this case, 2). This overrides whatever the HPA has scaled to, causing brief performance hiccups. This is documented in Rook GitHub Issue #10001 and was closed as "not planned." Users should be aware that HPA-based scaling of Rook-managed RGW deployments is not fully supported and will experience periodic replica count resets during operator reconciliation. A future revision of this post could add a caveat about this behavior.

### CephObjectStore YAML is accurate
The CephObjectStore CR (API version `ceph.rook.io/v1`) with `metadataPool`, `dataPool`, and `gateway` fields including `instances`, `port`, and `resources` is correct per current Rook CRD specifications.

### HPA YAML is correct
The `autoscaling/v2` HPA spec is valid. The deployment name `rook-ceph-rgw-my-store-a` follows Rook's naming convention for RGW deployments. The `behavior` section with stabilization windows and scaling policies uses correct field names and valid values.

### Service selector and ports are correct
The selector `app: rook-ceph-rgw` and `rgw: my-store` are valid labels set by Rook on RGW pods. The `targetPort: 8080` and `targetPort: 8443` values are correct — Rook uses internal ports 8080/8443 for RGW containers (since unprivileged containers cannot bind to ports below 1024), regardless of the `gateway.port` value in the CephObjectStore CR.

### RGW statelessness claim is accurate
RGW is indeed stateless at the gateway layer — each instance connects to the same RADOS cluster backend, making horizontal scaling straightforward.
