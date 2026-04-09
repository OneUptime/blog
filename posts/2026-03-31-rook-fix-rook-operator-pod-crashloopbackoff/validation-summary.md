# Validation Summary: How to Fix Rook Operator Pod CrashLoopBackOff

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (v1.13.0)
- Ceph
- Kubernetes (kubectl CLI)
- Docker

## Sources Consulted
- Rook GitHub repository structure for v1.13.0: https://github.com/rook/rook/tree/v1.13.0/deploy/examples
- Rook v1.13.0 release page: https://github.com/rook/rook/releases/tag/v1.13.0
- Rook operator.yaml manifest (v1.13.0): https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/operator.yaml
- Rook CRDs manifest (v1.13.0): https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/crds.yaml
- Rook upgrade documentation: https://rook.io/docs/rook/latest-release/Upgrade/rook-upgrade/
- Docker Hub rook/ceph image: https://hub.docker.com/r/rook/ceph

## Issues Found
1. **Incorrect CRD manifest URL**: The post referenced `https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/crds/crds.yaml`, but in Rook v1.13.0 the CRDs file is located at `deploy/examples/crds.yaml`, not `deploy/crds/crds.yaml`. The original URL returns a 404. Fixed to `https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/crds.yaml`.

2. **Incorrect operator manifest URL**: The post referenced `https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/operator.yaml`, but in Rook v1.13.0 the operator manifest is located at `deploy/examples/operator.yaml`, not `deploy/operator.yaml`. The original URL returns a 404. Fixed to `https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/operator.yaml`.

## Review Notes
- Rook v1.13.0 was released December 13, 2021 and is now end-of-life. The commands and concepts remain valid, but readers deploying new clusters should use a current supported version (v1.16+).
- All kubectl commands, flags, label selectors (`app=rook-ceph-operator`), ConfigMap name (`rook-ceph-operator-config`), CRD names, and Docker image name (`rook/ceph:v1.13.0`) were verified as correct.
- The resource limits example (256Mi request / 512Mi limit) is reasonable for the operator pod.
