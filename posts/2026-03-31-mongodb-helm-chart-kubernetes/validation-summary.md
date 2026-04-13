# Validation Summary: How to Use MongoDB Helm Chart for Kubernetes Deployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Kubernetes
- Helm (package manager for Kubernetes)
- Bitnami MongoDB Helm Chart
- Prometheus / ServiceMonitor (metrics)
- WiredTiger (MongoDB storage engine)

## Sources Consulted
- Bitnami MongoDB Helm chart on ArtifactHub: https://artifacthub.io/packages/helm/bitnami/mongodb
- Bitnami MongoDB Helm chart source on GitHub: https://github.com/bitnami/charts/tree/main/bitnami/mongodb
- Helm CLI documentation: https://helm.sh/docs/
- Kubernetes documentation for StatefulSets, Services, and PVCs: https://kubernetes.io/docs/

## Issues Found
1. **`service.port` renamed to `service.ports.mongodb`**: In current versions of the Bitnami MongoDB Helm chart, the `service.port` parameter has been restructured to `service.ports.mongodb`. Updated the values.yaml example from `service.port: 27017` to `service.ports.mongodb: 27017`.

## Review Notes
- The `helm repo add bitnami https://charts.bitnami.com/bitnami` method is the legacy approach. Bitnami now distributes charts via OCI registry (`oci://registry-1.docker.io/bitnamicharts/mongodb`). The traditional HTTP URL may still work but is no longer the recommended method. A future update could mention both approaches.
- The `auth.rootUser` is set to `admin` in the values.yaml, which overrides the default of `root`. The connection string in the "Connecting to MongoDB" section correctly uses `admin` as the username, which is consistent with this configuration. However, readers following only the Quick Install section (which doesn't set `rootUser`) would need to use `root` instead.
- The `auth.existingSecret` section shows only `mongodb-root-password` and `mongodb-replica-set-key` keys. The chart also supports `mongodb-passwords` (for custom users) and `mongodb-metrics-password` (for metrics exporter), but these are optional and not needed for the basic scenario shown.
- All Helm CLI commands (`install`, `upgrade`, `rollback`, `uninstall`, `history`, `status`) use correct syntax and flags.
- The `extraFlags` parameter with `--wiredTigerCacheSizeGB=2` is correct and matches examples in the chart's own values.yaml.
- The PVC cleanup note after uninstall is accurate and an important operational detail.
