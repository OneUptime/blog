# Validation Summary: How to Migrate from Docker Swarm to Kubernetes

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Docker Swarm
- Docker Compose stack files
- Docker secrets and configs
- Kubernetes Deployments, Services, Namespaces, Secrets, ConfigMaps, and PersistentVolumeClaims
- kubectl
- Kompose
- PostgreSQL Docker image
- Redis Docker image

## Sources Consulted
- Docker CLI reference for `docker secret inspect`: https://docs.docker.com/reference/cli/docker/secret/inspect/
- Docker documentation for Swarm secrets: https://docs.docker.com/engine/swarm/secrets/
- Kubernetes documentation for Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes documentation for Services and headless Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation for PersistentVolumes and PersistentVolumeClaims: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes documentation for StorageClasses: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes documentation for container resource requests and limits: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation for StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kompose documentation: https://kompose.io/ and https://kompose.io/conversion/
- Docker PostgreSQL official image guidance: https://hub.docker.com/_/postgres and https://www.docker.com/blog/how-to-use-the-postgres-docker-official-image/

## Issues Found
- The Swarm PostgreSQL example attached `db_password` as a secret but did not configure the official PostgreSQL image to read it. Added `POSTGRES_PASSWORD_FILE=/run/secrets/db_password` so the Swarm stack can initialize PostgreSQL using the mounted secret file.
- The secret migration command attempted to read secret data using `docker secret inspect --format '{{.Spec.Data}}'`. Docker's inspect output exposes secret metadata, not the secret payload. Replaced it with `kubectl create secret generic ... --from-file=...` using the original secret source file.
- The database Kubernetes Service used `clusterIP: None` with a comment saying it provided a stable DNS name. A normal ClusterIP Service already provides stable in-cluster service DNS for this use case; headless Services return endpoint records and are mainly needed when clients need direct pod discovery. Changed it to `type: ClusterIP` with an internal-access comment.
- The verification command used `curl` against Redis on port 6379 using an HTTP URL. Redis is not an HTTP service. Replaced it with a temporary `redis:7-alpine` pod running `redis-cli -h cache ping`.

## Review Notes
The Kubernetes manifests and CLI examples were reviewed against official documentation, but `kubectl`, `kompose`, and `yq` were not installed in the workspace, so local schema validation and command execution were not performed. The database example remains intentionally simple; for production PostgreSQL on Kubernetes, a StatefulSet or a managed database service would usually be more appropriate than a single-replica Deployment.
