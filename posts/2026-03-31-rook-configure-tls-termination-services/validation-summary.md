# Validation Summary: How to Configure TLS Termination for Rook-Ceph Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- TLS/SSL certificates
- Kubernetes Ingress (networking.k8s.io/v1)
- cert-manager (certificate automation)
- Ceph Dashboard
- Ceph RGW (RADOS Gateway / S3 API)
- Ceph msgr2 protocol (on-wire encryption)
- nginx Ingress Controller

## Sources Consulted
- [Rook Ceph Dashboard Documentation (v1.14)](https://rook.io/docs/rook/v1.14/Storage-Configuration/Monitoring/ceph-dashboard/)
- [CephObjectStore CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- [CephCluster CRD Documentation](https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/)
- [Rook CRD Specification (latest)](https://rook.io/docs/rook/latest/CRDs/specification/)
- [Rook Object Storage Overview](https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- [Ceph Messenger v2 Documentation](https://docs.ceph.com/en/latest/rados/configuration/msgr2/)
- [Rook dashboard.go source code](https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mgr/dashboard.go)
- [Rook Helm chart values.yaml](https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph-cluster/values.yaml)
- [Rook dashboard documentation (master)](https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Monitoring/ceph-dashboard.md)
- [Rook Issue #9054 - Simplify enabling encryption for data in transit](https://github.com/rook/rook/issues/9054)

## Issues Found

### 1. Incorrect dashboard custom TLS certificate approach
**What was wrong:** The post instructed readers to create a Kubernetes TLS secret named `rook-ceph-mgr-dashboard-tls` and implied Rook would automatically use it for the dashboard. The Rook `DashboardSpec` CRD has no `sslCertificateRef` field, and the Rook source code (`dashboard.go`) manages dashboard certificates internally via `ceph dashboard create-self-signed-cert`. The secret name `rook-ceph-mgr-dashboard-tls` is not referenced anywhere in Rook's documentation or source code.

**What was changed:** Replaced the incorrect secret-based approach with the correct Ceph CLI commands (`ceph dashboard set-ssl-certificate` and `ceph dashboard set-ssl-certificate-key`) executed through the toolbox pod, and added a pointer to the Ingress-based TLS section as the alternative for automated certificate management.

### 2. Monitor encryption used manual `ceph config set` instead of Rook CRD
**What was wrong:** The post used `ceph config set mon ms_cluster_mode secure` and `ceph config set osd ms_cluster_mode secure` commands executed via the toolbox pod. In a Rook-managed cluster, manual Ceph configuration changes can be overridden by the operator. Additionally, only `mon` and `osd` were configured, missing `mds`, `mgr`, and other daemon types. Rook provides a CRD-based approach (`spec.network.connections.encryption.enabled`) that is the documented and recommended way to enable msgr2 encryption.

**What was changed:** Replaced the manual `ceph config set` commands with the CRD-based approach using `spec.network.connections.encryption.enabled: true` and `spec.network.connections.requireMsgr2: true`, which ensures all daemon types are configured correctly by the Rook operator.

### 3. Incorrect msgr2 verification command
**What was wrong:** The post used `ceph mon dump | grep secure` to verify msgr2 encryption status. `ceph mon dump` outputs the monitor map (addresses, epoch, quorum info) and does not contain the word "secure" in relation to encryption mode. This command would produce no output and mislead users into thinking encryption is not enabled.

**What was changed:** Replaced with `ceph config dump | grep ms_cluster_mode`, which directly shows the configured encryption mode for each daemon type.

### 4. Summary section referenced outdated approach
**What was wrong:** The summary mentioned "enable msgr2 secure mode" without referencing the CRD approach.

**What was changed:** Updated to reference `network.connections.encryption` in the CephCluster CRD.

## Review Notes
- The RGW TLS section using `sslCertificateRef` in the CephObjectStore CRD is correct and well-documented.
- The cert-manager Certificate resource for RGW is correctly structured.
- The Ingress configuration for TLS termination is correct and uses the current `networking.k8s.io/v1` API.
- The dashboard `spec.dashboard.ssl: true` with `port: 8443` is correct per the CRD specification.
- Enabling `network.connections.encryption` requires kernel 5.11+ for nbd and CephFS drivers. The post does not mention this kernel requirement, which could be noted in a future update.
- For CephFS volumes with encryption, the `CSI_CEPHFS_KERNEL_MOUNT_OPTIONS` must be set to `ms_mode=secure` in the operator configuration. This is not covered but may be out of scope for this post.
