# Validation Summary: How to Troubleshoot Known Multus Limitations with Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Multus CNI (multi-network plugin for Kubernetes)
- Kubernetes (container orchestration)
- Whereabouts IPAM (IP address management for CNI)
- macvlan (CNI plugin type)

## Sources Consulted
- Rook official documentation on Multus networking: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/#multus
- Multus CNI documentation: https://github.com/k8snetworkplumbingwg/multus-cni
- Whereabouts IPAM documentation: https://github.com/k8snetworkplumbingwg/whereabouts
- Kubernetes Network Attachment Definition spec: https://github.com/k8snetworkplumbingwg/network-attachment-definition-client
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
No technical issues found.

## Review Notes
- The post uses the legacy `provider: multus` with `selectors` configuration approach. Rook v1.13+ introduced `network.connections` as the newer method for configuring Multus, which also enables Multus support for monitor pods. The claim that "Monitor pods currently do not support Multus network selection" is accurate for the `selectors`-based configuration shown but may be misleading for users on newer Rook versions using `network.connections`.
- The `kubectl exec -it rook-ceph-tools` command assumes the toolbox pod is named exactly `rook-ceph-tools`. In deployments using the Rook toolbox as a Deployment resource, `kubectl exec -it deploy/rook-ceph-tools -n rook-ceph` would be more portable, but this is a minor convenience note rather than a technical error.
- The whereabouts `ippools` resource scope (namespaced vs cluster-scoped) has varied across whereabouts versions. The `-n rook-ceph` flag shown is reasonable but may not return results in all whereabouts configurations.
