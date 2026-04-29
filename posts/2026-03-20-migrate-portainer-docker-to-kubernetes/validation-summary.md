# Validation Summary: How to Migrate Portainer from Docker to Kubernetes - Kubernetes

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Portainer CE
- Docker
- Kubernetes
- kubectl
- PersistentVolumeClaim (PVC)
- Alpine Linux (used as a utility container)
- BoltDB (`portainer.db`)

## Sources Consulted
- Portainer CE Kubernetes installation docs: https://docs.portainer.io/start/install-ce/server/kubernetes
- Portainer CE Docker installation docs: https://docs.portainer.io/start/install-ce/server/docker
- Portainer official Kubernetes manifests: https://downloads.portainer.io/ce-lts/portainer-lts.yaml
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Deployment API reference (apps/v1): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#deployment-v1-apps
- Kubernetes Service / LoadBalancer reference: https://kubernetes.io/docs/concepts/services-networking/service/
- `kubectl cp` documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#cp
- Docker `docker run -v` and volume backup patterns: https://docs.docker.com/storage/volumes/#back-up-restore-or-migrate-data-volumes

## Issues Found
No technical issues found.

The blog post's commands, manifests, and explanations are accurate:

- The Docker volume backup pattern (`docker run --rm -v portainer_data:/data -v $(pwd):/backup alpine tar czf ...`) is the canonical approach documented by Docker.
- The PVC manifest is valid `v1` syntax with appropriate `ReadWriteOnce` access mode (Portainer runs as a single replica).
- `kubectl cp` followed by `kubectl exec ... tar xzf` works because Alpine includes BusyBox `tar`, which is required by `kubectl cp`.
- The Deployment manifest uses the correct image (`portainer/portainer-ce:latest`), the correct service account name from Portainer's official manifest (`portainer-sa-clusteradmin`), and the correct container ports (9000 HTTP UI, 9443 HTTPS UI, 8000 Edge tunnel).
- The LoadBalancer Service exposes the same three ports correctly.
- The Summary's reference to `portainer.db` matches Portainer CE's BoltDB data file.

## Review Notes
- Step 4 references `serviceAccountName: portainer-sa-clusteradmin` but does not show creating the ServiceAccount, ClusterRole, or ClusterRoleBinding. The post tells the reader to "use the official Portainer manifest, modified to use your restored PVC", which implies applying the upstream RBAC. A future revision could explicitly include the RBAC manifest or link to the official `portainer-lts.yaml` for completeness, but this is not a technical error.
- The Step 2 PVC snippet sets `storageClassName: standard` while the inline comment says "Remove storageClassName to use cluster default" — this is intentional guidance (the user picks one), but slightly easy to misread. Not a technical error.
- `image: portainer/portainer-ce:latest` works but pinning to a specific version (e.g., `2.21.4`) is generally recommended for production migrations to ensure reproducibility. Out of scope for a fix here since the post is a tutorial.
- Portainer offers an official Helm chart that handles much of this automation; a follow-up post or note could mention it as an alternative path.
