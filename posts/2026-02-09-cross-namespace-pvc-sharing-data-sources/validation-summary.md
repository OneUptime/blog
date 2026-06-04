# Validation Summary: How to Set Up Cross-Namespace PVC Sharing with Data Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumeClaims
- Kubernetes volume data sources and dataSourceRef
- Cross-namespace volume data sources
- CSI volume cloning and snapshot restore
- Gateway API ReferenceGrant
- Kubernetes feature gates
- kubectl

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/
- Kubernetes feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes CSIDriver API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/
- Kubernetes CSI cross-namespace data sources documentation: https://kubernetes-csi.github.io/docs/cross-namespace-data-sources.html
- Kubernetes CSI volume cloning documentation: https://kubernetes-csi.github.io/docs/volume-cloning.html
- Gateway API ReferenceGrant documentation: https://gateway-api.sigs.k8s.io/reference/api-types/referencegrant/
- Gateway API v1.5 API specification: https://gateway-api.sigs.k8s.io/reference/api-spec/1.5/spec/

## Issues Found
- The post said Kubernetes 1.22 introduced cross-namespace volume data sources as beta. Kubernetes documents this feature as introduced in Kubernetes 1.26 and still alpha, so the version and feature state were corrected.
- The post described the feature as sharing persistent data across namespaces. Cross-namespace data sources populate a new PVC from a source PVC or VolumeSnapshot; they do not live-share a PVC. Wording was changed to copy, clone, and restore where needed.
- The enablement instructions only mentioned kube-apiserver feature gates. Kubernetes and CSI documentation require enabling the relevant gates on kube-apiserver and kube-controller-manager, enabling CrossNamespaceVolumeDataSource on the CSI external-provisioner, installing the ReferenceGrant CRD, and granting the provisioner ReferenceGrant read permissions. The setup section was corrected.
- ReferenceGrant examples used gateway.networking.k8s.io/v1beta1. The current Gateway API ReferenceGrant resource is GA in gateway.networking.k8s.io/v1, so the manifests were updated.
- The CSI driver requirements section implied that `kubectl describe csidriver` exposes volume cloning and cross-namespace support. The Kubernetes CSIDriver API has no standard clone-support field, so this was replaced with guidance to check driver documentation and the CSI external-provisioner deployment.
- The post claimed specific popular cloud CSI drivers support the feature without sourced provider-specific confirmation. That unsupported claim was removed.
- The storage-cost guidance said cross-namespace cloning creates full copies. This was softened because drivers may optimize copies internally, but users should not assume optimization without checking their storage backend.

## Review Notes
The examples are syntactically plausible Kubernetes manifests, but they depend on cluster-specific storage classes, CSI driver capabilities, Gateway API CRD installation, external-provisioner version and RBAC, and whether the managed Kubernetes provider permits alpha feature gates.
