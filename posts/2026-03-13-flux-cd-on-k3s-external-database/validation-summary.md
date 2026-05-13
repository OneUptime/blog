# Validation Summary: How to Set Up Flux CD on k3s with External Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k3s
- Kubernetes
- Flux CD
- GitOps Toolkit GitRepository and Kustomization resources
- PostgreSQL
- MySQL

## Sources Consulted
- k3s High Availability External DB documentation: https://docs.k3s.io/datastore/ha
- k3s Cluster Datastore documentation: https://docs.k3s.io/datastore
- k3s Server CLI documentation: https://docs.k3s.io/cli/server
- k3s Requirements documentation: https://docs.k3s.io/installation/requirements
- k3s Backup and Restore documentation: https://docs.k3s.io/datastore/backup-restore
- Flux GitHub bootstrap command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The prerequisites listed PostgreSQL 12+ as generally supported. Current k3s documentation lists certified PostgreSQL versions as 15, 16, and 17, and MySQL as 8.0 and 8.4, so the prerequisite was updated to match the official certification guidance.
- The additional k3s server-node command reused `DB_PASSWORD` without defining it on those nodes and did not pass the cluster token explicitly. The example was updated to export both values and pass `--token=${K3S_TOKEN}`.
- The additional server-node command used `--server` even though the official external datastore HA flow joins additional servers by using the same datastore endpoint and token. The flag was removed from that example.
- The additional server-node command omitted the hostname TLS SAN and the server taint used on the first server. These options were added so the server configuration is consistent across the HA server nodes.
- The MySQL TLS best practice recommended adding `tls=true` to the datastore endpoint. Current k3s datastore documentation notes a known issue with setting the MySQL `tls` DSN parameter directly, so the recommendation was changed to use k3s datastore TLS certificate flags such as `--datastore-cafile`.
- The post stated not to use an external datastore for clusters over 100 nodes. Current k3s requirements recommend HA with an external database for production and large clusters and provide sizing guidance beyond 100 nodes, so the statement was replaced with sizing guidance.

## Review Notes
The Flux bootstrap command and Flux `GitRepository`/`Kustomization` manifests use current v1 API versions and match the official Flux documentation. The PostgreSQL and MySQL SQL snippets are plausible for preparing databases, but production deployments should still align privileges, TLS, backups, and database sizing with the managed database provider's guidance.
