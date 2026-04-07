# Validation Summary: How to Set Up Discovery Daemon in Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (DaemonSets, ConfigMaps)
- Helm (chart configuration)

## Sources Consulted
- Rook operator Helm chart `values.yaml` (https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml)
- Rook operator source code `pkg/operator/discover/discover.go` (https://github.com/rook/rook/blob/master/pkg/operator/discover/discover.go)
- Rook Helm chart documentation (https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/)

## Issues Found

1. **Incorrect resource type for discovery results**: The post claimed the discovery daemon "creates `CephBlockDeviceList` custom resources." In reality, discovery results are stored in ConfigMaps named `local-device-<nodename>`, not in any CRD. Fixed the Overview section.

2. **Wrong ConfigMap label selector**: The command to list discovered devices used `-l rook.io/device-discovery=""`, which is not a real label. The correct label selector is `app=rook-discover`. Fixed the kubectl command.

3. **Incorrect Helm value name for resources**: The post used `discoveryDaemonResources` as a top-level Helm value, but the actual Helm value path is `discover.resources`. Fixed the YAML snippet.

4. **Non-existent Helm value for security context**: The post showed `discoveryDaemonSecurityContext` as a configurable Helm value with `privileged: true` and `runAsUser: 0`. This Helm value does not exist — the security context is hardcoded in the operator source code and automatically applied. Rewrote the section to accurately explain this.

## Review Notes
- The `enableDiscoveryDaemon`, `discoveryDaemonInterval`, and `rook-release/rook-ceph` chart name are all correct.
- The CephCluster CR example and static device configuration example are accurate.
- The default interval of 60 minutes is confirmed correct from the Helm chart values.
