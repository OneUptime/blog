# Validation Summary: How to configure volume mounts with subPath and security considerations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes volumes and volumeMounts
- subPath and subPathExpr
- ConfigMaps, Secrets, projected volumes, emptyDir, and PersistentVolumeClaims
- Kubernetes securityContext settings
- kubectl and jq

## Sources Consulted
- Kubernetes API reference: Pod v1 VolumeMount fields, including subPath and subPathExpr: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes volumes documentation, including subPath, subPathExpr, ConfigMap, Secret, downwardAPI, emptyDir, and PVC notes: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes ConfigMap documentation, including the subPath update limitation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes blog: Fixing the Subpath Volume Vulnerability in Kubernetes: https://kubernetes.io/blog/2018/04/04/fixing-subpath-volume-vulnerability/

## Issues Found
- The post described subPathExpr as a safer alternative to subPath. Kubernetes documents subPathExpr as behaving similarly to subPath with environment variable expansion, so I changed the wording to describe it as a dynamic alternative and noted that the same security controls apply.
- The read-only subPath example wrote `/data/config/app.conf` without creating `/data/config` first. I added `mkdir -p /data/config` so the init container command works.
- The audit commands only checked regular containers and only checked `subPath`, while the post says to audit subPath configurations generally. I updated the jq filters to include init containers, regular containers, ephemeral containers, `subPath`, and `subPathExpr`, and to avoid errors when a container has no volume mounts.
- The testing example said `cd /app/data/..` should fail or show isolation. That path resolves to the parent directory in the container filesystem, not the volume root, so I corrected the comment and explanatory text.
- The best-practices and conclusion sections recommended subPathExpr instead of static subPath as a blanket rule. I narrowed that guidance to using subPathExpr when paths should be derived dynamically from pod metadata.

## Review Notes
The examples use current Kubernetes core/v1 Pod fields and the referenced ConfigMap, Secret, projected volume, and subPath behavior matches official Kubernetes documentation. The examples still use placeholder images and PVC names, so they require corresponding images, ConfigMaps, Secrets, and PersistentVolumeClaims to exist before being applied in a real cluster.
