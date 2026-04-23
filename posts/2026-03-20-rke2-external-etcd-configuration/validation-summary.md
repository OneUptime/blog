# Validation Summary: How to Configure RKE2 with External etcd - Configuration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RKE2
- etcd
- Kubernetes
- TLS client certificates
- systemd
- kubectl

## Sources Consulted
- RKE2 External Datastore documentation: https://docs.rke2.io/datastore/external
- RKE2 Backup and Restore documentation: https://docs.rke2.io/datastore/backup_restore
- etcd v3.6 Install documentation: https://etcd.io/docs/v3.6/install/
- etcd v3.6 Configuration Options documentation: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd v3.6 System Limits documentation: https://etcd.io/docs/v3.6/dev-guide/limit/
- etcd GitHub releases: https://github.com/etcd-io/etcd/releases
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes API source for ComponentStatus deprecation: https://raw.githubusercontent.com/kubernetes/api/master/core/v1/types.go

## Issues Found
- The RKE2 configuration used incorrect external etcd keys: `disable-etcd`, `etcd-servers`, `etcd-cafile`, `etcd-certfile`, and `etcd-keyfile`. Current RKE2 external datastore documentation uses `datastore-endpoint` as a comma-separated etcd URL string, with `datastore-cafile`, `datastore-certfile`, and `datastore-keyfile` for TLS client authentication. Updated the configuration snippet accordingly.
- The etcd install example pinned `v3.5.13`, which is outdated for a new setup. Updated it to `v3.6.10`, the current etcd release shown in the official GitHub releases at review time. Also changed `tar xvf` to `tar xzf` for explicit gzip extraction.
- The verification command used `kubectl get componentstatuses`, but `ComponentStatus` is deprecated in Kubernetes v1.19 and newer. Replaced it with `kubectl get --raw='/readyz?verbose'`, which uses the documented Kubernetes API server readiness endpoint.

## Review Notes
- The etcd configuration keys for listener URLs, advertised URLs, initial cluster membership, and TLS settings match the etcd v3.6 configuration model.
- The external datastore backup guidance is consistent with RKE2 documentation: backups for external datastores are handled outside RKE2.
- For multi-server RKE2 deployments, additional server nodes should be joined with the shared token and an appropriate `server` URL for the existing server or registration endpoint, as described in the RKE2 external datastore documentation.
