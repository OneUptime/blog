# Validation Summary: How to Manage IoT Device Configuration with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization API
- Kubernetes ConfigMaps
- Kubernetes DaemonSets
- Kustomize overlays and patches
- Git and GitHub Actions CI
- IoT edge Kubernetes patterns

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux April 2023 update noting removal of deprecated `.spec.validation`: https://v2-0.docs.fluxcd.io/blog/2023/05/april-2023-update/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes ConfigMap update documentation: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes ConfigMap concept documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The Flux `Kustomization` example used `spec.validation: server`, but this field was removed from the Flux `kustomize.toolkit.fluxcd.io/v1` API. Removed the field and adjusted the surrounding text to describe Kubernetes API validation during Flux apply plus CI validation before merge.
- The Kustomize overlay showed only a `configmap-patch.yaml` file. Added the corresponding `kustomization.yaml` using the current `patches` field so the patch is actually applied to the base ConfigMap.
- The GitHub Actions validation command used `grep -oP '[\-0-9.]+'`, which would also match the hyphen in `temperature-offset` before the numeric value. Replaced it with an `awk` extraction for the quoted value and an `awk` numeric range check.

## Review Notes
- ConfigMap volume updates are technically valid for this pattern, but Kubernetes only updates mounted files eventually; the agent still needs to poll or watch files and reload configuration.
- The examples assume a device configuration agent image exists and has the necessary host permissions to write `/host/etc/sensor`; that implementation is intentionally out of scope for the post.
