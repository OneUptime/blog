# Validation Summary: How to Set Up Init Containers for Pre-Flight Checks in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes init containers
- Kubernetes Deployments and Pods
- Kubernetes Pod lifecycle and restart policies
- Kubernetes volumes and emptyDir
- kubectl logs, exec, events, and rollout status
- PostgreSQL psql
- curl
- OpenSSL

## Sources Consulted
- Kubernetes documentation: Init Containers - https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes documentation: Pod Lifecycle - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes documentation: Sidecar Containers - https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes documentation: Share Process Namespace between Containers in a Pod - https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Kubernetes reference: kubectl logs - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes reference: kubectl rollout status - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- PostgreSQL documentation: psql - https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL documentation: libpq connection strings - https://www.postgresql.org/docs/current/libpq-connect.html
- curl documentation: curl man page - https://curl.se/docs/manpage.html

## Issues Found
- Corrected the lifecycle diagram state labels. Kubernetes keeps a Pod with initializing containers in the Pending phase until init containers complete; application containers then run and the Pod can become Ready.
- Corrected the init container comparison table. Regular init containers are retried according to the Pod restartPolicy, do not support probes, and their resource requests/limits are accounted for using the highest init request/limit rather than as independent runtime resources.
- Updated the configuration download example from `curl -s` to `curl -fsS` so HTTP 4xx/5xx responses fail the init container instead of potentially writing an error body as a configuration file.
- Added `tls-app.production.svc` to the generated certificate Subject Alternative Name list so the certificate covers the common Kubernetes service DNS form as well as the fully qualified service name.
- Updated the seed data example to pass `"$DATABASE_URL"` to `psql`; `DATABASE_URL` is an application convention and psql needs the connection URI supplied as its database argument unless PG* environment variables are used.
- Completed the `kubectl` init container Deployment example with selector, template labels, and an application container so it is valid as an apps/v1 Deployment manifest.
- Replaced the shared process namespace init-container example with a shared volume state example. Process namespace sharing is for simultaneously running containers, while regular init containers complete before application containers start; shared volumes are the correct mechanism for passing init output to app containers.

## Review Notes
The code snippets are illustrative and use placeholder images, Services, Secrets, ConfigMaps, PVCs, and internal URLs that must exist in the target cluster. The `kubectl` init container example also requires RBAC permissions for its service account to read Deployment rollout status in the referenced namespace.
