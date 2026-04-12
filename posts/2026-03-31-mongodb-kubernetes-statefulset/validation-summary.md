# Validation Summary: How to Deploy MongoDB on Kubernetes with a StatefulSet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Kubernetes (StatefulSets, Services, Secrets, PersistentVolumeClaims)
- mongosh (MongoDB Shell)
- Docker official mongo image

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Pod spec (command vs args): https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Official mongo Docker image and entrypoint behavior: https://hub.docker.com/_/mongo
- MongoDB rs.initiate() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB replica set deployment: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/
- Kubernetes headless Services: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes DNS for StatefulSet pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
1. **`command` used instead of `args` in container spec** — The StatefulSet manifest used `command: [mongod, --replSet, rs0, --bind_ip_all]`. In Kubernetes, `command` overrides Docker's ENTRYPOINT, which for the official mongo image is `docker-entrypoint.sh`. Bypassing the entrypoint means the `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` environment variables are never processed, so no root user is created. Fixed by changing `command` to `args` (which overrides Docker's CMD) and removing the `mongod` entry (the entrypoint automatically prepends `mongod` when the first argument starts with `-`). This ensures the entrypoint runs, creates the initial root user, and then starts mongod with the replica set arguments.

## Review Notes
- The `storageClassName: "standard"` is GKE-specific. Other providers use different default names (e.g., `gp2`/`gp3` on EKS, `managed-premium` on AKS). The post does instruct readers to check their StorageClass, which mitigates this.
- For a production deployment, intra-replica-set authentication via `--keyFile` should be configured. The post focuses on a basic tutorial setup and appropriately recommends the MongoDB Community Kubernetes Operator for production use.
- The `ping` admin command used in readiness/liveness probes does not require authentication, so the probes work correctly regardless of auth configuration.
- The client service routes to all pods (primary and secondaries), not just the primary. The post correctly notes that the "driver handles primary selection," which is accurate — the MongoDB driver discovers the replica set topology and routes writes to the primary.
