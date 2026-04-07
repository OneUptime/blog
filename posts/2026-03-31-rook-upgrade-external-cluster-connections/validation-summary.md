# Validation Summary: How to Upgrade External Cluster Connections in Rook

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (secrets, ConfigMaps, deployments)
- CSI (Container Storage Interface) drivers

## Sources Consulted
- Rook official documentation for external clusters: https://rook.io/docs/rook/latest/Getting-Started/ceph-cluster-crd/#external-cluster
- Rook GitHub repository `create-external-cluster-resources.py` script: https://github.com/rook/rook/blob/master/deploy/examples/create-external-cluster-resources.py
- Rook GitHub repository `import-external-cluster.sh`: https://github.com/rook/rook/blob/master/deploy/examples/import-external-cluster.sh
- Rook GitHub repository `cluster-external.yaml` example: https://github.com/rook/rook/blob/master/deploy/examples/cluster-external.yaml
- Rook CephCluster Go types (`pkg/apis/ceph.rook.io/v1/types.go`) for cluster state constants

## Issues Found
No technical issues found.

## Review Notes
- The `cephVersion.image` field in Step 5 is not included in the official external cluster example (`cluster-external.yaml`). For external clusters, Rook detects the Ceph version through the connection to the provider cluster. Including `cephVersion.image` is not harmful but is unnecessary — the official docs omit it. This is a stylistic choice rather than a technical error.
- The mon endpoint format uses port 6789 (msgr1/v1), which is the default in Rook's external cluster tooling. Modern Ceph clusters also support msgr2 on port 3300, which can be enabled with the `--v2-port-enable` flag on the export script. The post could mention this as an option but is not incorrect as-is.
- The `client.healthchecker` username is a valid Ceph client user created by the external cluster export script for health checking purposes.
