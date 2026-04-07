# Validation Summary: How to Use Rook-Ceph with OpenShift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- OpenShift Container Platform (OCP)
- OpenShift Data Foundation (ODF)
- Security Context Constraints (SCCs)
- Operator Lifecycle Manager (OLM) / OperatorHub
- Ceph (distributed storage system)
- CSI drivers (RBD and CephFS)
- OpenShift Routes
- Prometheus ServiceMonitor

## Sources Consulted
- Rook documentation for OpenShift: https://rook.io/docs/rook/latest/Getting-Started/openshift/
- Rook CephCluster CRD reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- OpenShift SCC documentation: https://docs.openshift.com/container-platform/latest/authentication/managing-security-context-constraints.html
- OpenShift Data Foundation operator documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/
- OpenShift DeploymentConfig deprecation notice (OCP 4.14): https://docs.openshift.com/container-platform/4.14/applications/deployments/what-deployments-are.html
- Kubernetes toleration key changes for control-plane nodes: https://kubernetes.io/docs/reference/labels-annotations-taints/#node-role-kubernetes-io-control-plane
- Rook Prometheus monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/

## Issues Found

1. **DeploymentConfig is deprecated (replaced with Deployment)**
   - **What was wrong:** The post used `apps.openshift.io/v1 DeploymentConfig` as the example workload. DeploymentConfig has been deprecated since OpenShift 4.14 in favor of standard Kubernetes `apps/v1 Deployment`.
   - **What was changed:** Replaced the DeploymentConfig example with a standard `apps/v1 Deployment`, including the required `selector.matchLabels` and `template.metadata.labels` fields.
   - **Why:** Using deprecated resources in a tutorial leads readers to adopt outdated patterns. Standard Deployments are the recommended approach.

2. **ROOK_ENABLE_DISCOVERY_DAEMON incorrectly described as enabling metrics**
   - **What was wrong:** The monitoring section stated "Enable Ceph metrics scraping in the Rook operator ConfigMap" and then set `ROOK_ENABLE_DISCOVERY_DAEMON: "true"`. This flag enables the Rook device discovery daemon (which scans nodes for available storage devices), not Prometheus metrics scraping. Rook exposes Ceph metrics from the manager daemon by default.
   - **What was changed:** Removed the misleading ConfigMap edit instructions and clarified that Rook-Ceph exposes Prometheus metrics by default, with the ServiceMonitor being the only configuration needed for OpenShift monitoring integration.
   - **Why:** The original text conflated device discovery with metrics collection, which would confuse readers.

3. **Toleration key `node-role.kubernetes.io/master` is outdated**
   - **What was wrong:** The CephCluster placement toleration used the `node-role.kubernetes.io/master` key, which has been replaced by `node-role.kubernetes.io/control-plane` in Kubernetes 1.24+ and modern OpenShift versions.
   - **What was changed:** Updated to `node-role.kubernetes.io/control-plane`.
   - **Why:** While `master` may still work for backward compatibility, the canonical label is now `control-plane` and new tutorials should use the current convention.

## Review Notes
- The ODF Subscription uses `channel: stable-4.16` which is version-specific. Readers on different OCP versions will need to adjust the channel (e.g., `stable-4.15`, `stable-4.17`). This is acceptable as-is since it serves as an example.
- The Ceph image `quay.io/ceph/ceph:v19.2.0` (Squid release) is current as of the post date.
- The CSI service account names (`rook-csi-rbd-plugin-sa`, `rook-csi-cephfs-plugin-sa`) match the upstream Rook naming convention.
- The ServiceMonitor configuration is correct and follows the standard pattern for integrating with the OpenShift monitoring stack.
