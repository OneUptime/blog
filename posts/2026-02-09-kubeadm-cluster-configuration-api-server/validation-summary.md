# Validation Summary: How to Configure kubeadm ClusterConfiguration for Custom API Server Flags

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-apiserver
- Kubernetes audit logging
- Kubernetes encryption at rest
- Kubernetes admission controllers
- OpenID Connect authentication

## Sources Consulted
- Kubernetes kubeadm configuration API v1beta3: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- Kubernetes kubeadm init documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes reconfiguring a kubeadm cluster: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/

## Issues Found
- Replaced removed feature gates `TTLAfterFinished` and `EphemeralContainers` with `ValidatingAdmissionPolicy` in the Kubernetes 1.28 examples. The removed feature gates reference shows `TTLAfterFinished` was removed after Kubernetes 1.24 and `EphemeralContainers` after Kubernetes 1.26, so they would not be valid for the post's `v1.28.0` examples.
- Replaced `default-watch-cache-size` with `watch-cache`. The current kube-apiserver reference documents `--watch-cache` and `--watch-cache-sizes`, but not `--default-watch-cache-size`.
- Corrected the example encryption key output. The previous sample decoded to 37 bytes, while the documented command is meant to produce a base64-encoded 32-byte key.
- Replaced `PodSecurityPolicy` with `PodSecurity` in the admission controller example. Kubernetes documentation states that `PodSecurity` replaced the older `PodSecurityPolicy` admission controller, which was removed before Kubernetes 1.28.
- Replaced `PersistentVolumeLabel` in the disabled admission plugins example with `DefaultStorageClass`, because `PersistentVolumeLabel` is not listed in the current kube-apiserver admission plugin reference.
- Removed `insecure-port: "0"` from the common flags reference because the current kube-apiserver reference no longer documents `--insecure-port`.
- Updated the kubeadm package install example from the legacy `1.28.x-00` pattern to the current documented apt version pattern `1.28.x-*`.
- Removed `--config kubeadm-config.yaml` from the `kubeadm upgrade apply` example. Current kubeadm upgrade guidance states that `kubeadm upgrade` is not the path for reconfiguring an existing cluster; reconfiguration should be handled through the kubeadm reconfiguration workflow.
- Changed the verification comment from "Check API server flags via API" to "Check API server metrics" because `/metrics` exposes metrics, not a canonical API-server flag listing.

## Review Notes
The examples intentionally remain centered on Kubernetes `v1.28.0` and kubeadm `kubeadm.k8s.io/v1beta3`, which is appropriate for the version shown in the post. For a future modernization pass, consider adding a note that newer kubeadm releases use newer kubeadm config API versions such as `v1beta4`.
