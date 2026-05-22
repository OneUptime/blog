# Validation Summary: How to Configure Istio for NFS Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio sidecar injection and traffic redirection annotations
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes NFS volumes
- Kubernetes StorageClasses
- Kubernetes CSI NFS driver
- NFS protocol ports and RPC services
- Helm-based CSI driver installation
- kubectl troubleshooting commands

## Sources Consulted
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes CSI NFS driver README: https://github.com/kubernetes-csi/csi-driver-nfs
- Kubernetes CSI NFS driver Helm chart documentation: https://github.com/kubernetes-csi/csi-driver-nfs/tree/master/charts
- Kubernetes CSI NFS driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio platform requirements for traffic interception: https://istio.io/latest/docs/ops/deployment/platform-requirements/
- RFC 7530, Network File System (NFS) Version 4 Protocol: https://www.rfc-editor.org/rfc/rfc7530
- RFC 8881, Network File System (NFS) Version 4 Minor Version 1 Protocol: https://www.rfc-editor.org/rfc/rfc8881

## Issues Found
- Changed the broad claim that NFS traffic flows from the node in all cases to apply specifically to standard Kubernetes volume mounts. CSI provisioning and provisioner maintenance activity can involve driver pods, but application I/O through mounted PVCs is still not intercepted by the application sidecar.
- Updated the NFS CSI driver guidance to mention both the controller and node plugin pods. The official CSI NFS driver deploys both components, and both should avoid sidecar injection when their namespace is mesh-enabled.
- Replaced the deprecated `sidecar.istio.io/inject` annotation examples with the current pod label form documented by Istio.
- Corrected the in-cluster NFS server Deployment example by adding the required `spec.selector` for an `apps/v1` Deployment and ensuring the pod template has the `app: nfs-server` label used by the Service selector.
- Clarified that an in-cluster NFS server pod's sidecar can intercept inbound traffic to the NFS Service, rather than implying Istio fully handles both ends of kernel-level NFS client traffic.

## Review Notes
The Kubernetes YAML snippets parse successfully after the fixes. `kubectl` and `helm` were not installed in the local environment, so command validation was performed against official Kubernetes, Helm chart, Istio, and CSI driver documentation rather than local `--help` output.
