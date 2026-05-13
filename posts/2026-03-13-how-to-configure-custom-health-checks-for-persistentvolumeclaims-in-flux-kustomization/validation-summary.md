# Validation Summary: Custom Health Checks for PersistentVolumeClaims in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux CLI
- Kubernetes PersistentVolumeClaim
- Kubernetes PersistentVolume
- Kubernetes StorageClass
- Kubernetes CSI storage
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes SIG CLI `kstatus` package documentation: https://pkg.go.dev/sigs.k8s.io/cli-utils/pkg/kstatus/status

## Issues Found
- The pre-provisioned storage section said to health check both the PV and PVC, but Flux documents `PersistentVolumeClaim` as a supported built-in health check kind and does not list `PersistentVolume`. Changed the wording to define both resources and health check the PVC.
- The debugging command used `flux get kustomization database-storage`, while the documented Flux CLI command is `flux get kustomizations`. Updated the command to the documented plural form.

## Review Notes
The Flux `healthChecks`, `wait`, `timeout`, `dependsOn`, and `sourceRef` examples use current `kustomize.toolkit.fluxcd.io/v1` fields. The `WaitForFirstConsumer` explanation aligns with Kubernetes documentation: binding and provisioning are delayed until a Pod using the claim is created, with topology chosen from Pod scheduling constraints.
