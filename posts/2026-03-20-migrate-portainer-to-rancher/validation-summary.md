# Validation Summary: How to Migrate from Portainer to Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Portainer (Docker/Kubernetes management UI)
- Rancher (multi-cluster Kubernetes management)
- Kubernetes (kubectl, Deployments, Services, Secrets, RBAC)
- Helm (chart installation)
- Docker Compose
- Rancher Fleet (GitOps)
- Rancher Monitoring (Prometheus / Grafana)

## Sources Consulted
- Rancher Manager Docs - Install Rancher on Kubernetes: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/install-upgrade-rancher-on-a-kubernetes-cluster
- Rancher Manager Docs - Register Existing Clusters: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher Manager Docs - Enable Monitoring: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guide/enable-monitoring
- Rancher Manager Docs - Rancher RBAC: https://ranchermanager.docs.rancher.com/reference-guides/rancher-manager-architecture/about-rancher-rbac
- Portainer API Docs: https://docs.portainer.io/api/access
- Kubernetes Docs - kubectl resource types: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- **RBAC role mapping table (Step 5)**: The Rancher role "View-Only" does not exist as a built-in. Rancher's equivalent built-in role is **Read-only**, which is a project-level role (cluster-level built-ins are Cluster Owner, Cluster Member, and Custom). Updated the mapping row to read `Read-only (project-level)` to reflect the actual Rancher role name and scope.

## Review Notes
- The Helm install command for Rancher works as written, but for production deployments readers may want to add `--version <X.Y.Z>` to pin a Rancher chart version, and ensure the `cattle-system` namespace exists (the post does pre-create it with `kubectl create namespace`, which is correct). When using Let's Encrypt, an ingress controller (e.g., nginx) must be installed in the cluster — this is implied but not stated.
- The `kubectl get deployments,services,ingress,configmaps,secrets -A -o yaml` command is valid; kubectl accepts singular, plural, and short forms (e.g., `ing`) for resource types.
- The Monitoring chart path "Apps > Charts" reflects the modern Rancher v2.6+ UI; older v2.5 deployments used "Cluster Tools". No change needed for current Rancher versions.
- The Portainer API endpoint and `X-API-Key` header are correct for Portainer 2.11+.
- The cluster import URL format `https://rancher.example.com/v3/import/xxxxx.yaml` matches official Rancher documentation.
