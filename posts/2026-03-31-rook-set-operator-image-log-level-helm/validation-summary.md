# Validation Summary: How to Set Operator Image and Log Level in Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph operator
- Kubernetes
- Helm 3
- Container image management
- Operator logging configuration

## Sources Consulted
- Rook GitHub repository `values.yaml` for the `rook-ceph` Helm chart (`deploy/charts/rook-ceph/values.yaml` on `master` branch) — https://github.com/rook/rook
- Rook Helm chart deployment template (`deploy/charts/rook-ceph/templates/deployment.yaml`) for label and image reference verification
- Rook official documentation for Helm chart installation conventions — https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/

## Issues Found
No technical issues found.

## Review Notes
- The `image.repository` default in the actual chart is `docker.io/rook/ceph`, while the blog uses `rook/ceph`. Both are equivalent since Docker Hub is the default registry, so no correction needed.
- The chart also has a separate `csi.logLevel` (numeric 0–5) for CSI driver containers, distinct from the top-level `logLevel` (string: DEBUG/INFO/WARNING/ERROR) discussed in this post. The post correctly focuses on the operator-level `logLevel` but readers working with CSI logging should be aware these are different settings.
- The Helm repo alias `rook-release` is a convention from official docs (`helm repo add rook-release https://charts.rook.io/release`); the alias name is user-chosen but matches standard documentation examples.
- v1.13.2 is used as the example tag, which is a valid Rook release version.
