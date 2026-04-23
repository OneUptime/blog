# Validation Summary: How to Troubleshoot Rancher Database Connection Issues

## Status
not-technically-relevant

## Post Type
Guide

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- MySQL
- MariaDB
- `kubectl`

## Sources Consulted
- Rancher docs, "About High-availability Installations": https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-cluster-setup/high-availability-installs
- Rancher docs, "1. Set up Infrastructure": https://ranchermanager.docs.rancher.com/v2.12/getting-started/installation-and-upgrade/other-installation-methods/rancher-behind-an-http-proxy/set-up-infrastructure
- Rancher docs, "Helm CLI Quick Start": https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Rancher docs, "Installation Requirements": https://ranchermanager.docs.rancher.com/v2.12/getting-started/installation-and-upgrade/installation-requirements
- K3s docs, "Cluster Datastore": https://docs.k3s.io/datastore
- K3s docs, "High Availability External DB": https://docs.k3s.io/datastore/ha

## Issues Found
- The post's main technical premise is outdated for current Rancher. Current Rancher HA installations run Rancher on a Kubernetes cluster and Rancher server data is stored in that cluster's `etcd`, not in a Rancher-managed external MySQL database configured with `CATTLE_DB_*`.
- The documented configuration model is wrong. Current K3s external datastore configuration uses `--datastore-endpoint` or `K3S_DATASTORE_ENDPOINT`, with optional `K3S_DATASTORE_CAFILE`, `K3S_DATASTORE_CERTFILE`, and `K3S_DATASTORE_KEYFILE`, not `CATTLE_DB_HOST`, `CATTLE_DB_USER`, `CATTLE_DB_PASS`, or related variables.
- The troubleshooting steps depend on obsolete or unsupported internals, including a `rancher-db-secret`, Rancher deployment env inspection for `CATTLE_DB_*`, Rancher-side pool tuning via `CATTLE_DB_MAX_OPEN_CONNECTIONS` and `CATTLE_DB_MAX_IDLE_CONNECTIONS`, and manual recovery steps against `schema_migrations` and `cattle_lock`. These are not part of the current documented Rancher/K3s installation and operations model.
- Because the article would require a full rewrite to become accurate, I did not patch `README.md`. I marked the post as `not-technically-relevant` for removal instead.

## Review Notes
The post could be replaced by a new article focused on troubleshooting K3s external datastore connectivity for a Rancher management cluster. That would need different setup assumptions, different configuration variables, and different recovery procedures from the ones currently published here.
