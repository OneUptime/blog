# Validation Summary: How to Build Kubernetes ExternalName Services

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes Services
- Kubernetes ExternalName Services
- Kubernetes DNS / CoreDNS
- Kubernetes EndpointSlices
- kubectl
- Kustomize
- Python / psycopg2
- PostgreSQL container image

## Sources Consulted
- Kubernetes Service concepts: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes EndpointSlices concepts: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Docker Official Image documentation for Postgres: https://github.com/docker-library/docs/blob/master/postgres/README.md

## Issues Found
- The Python example used `os.environ["DB_PASSWORD"]` without importing `os`. Added `import os` so the snippet is runnable.
- The IP-address limitation described `192.168.1.100` as invalid. Kubernetes documents `spec.externalName` as an RFC 1123 hostname; IPv4-looking values can be accepted as DNS names but are not resolved as IP targets. Updated the wording and inline comment to explain the actual behavior.
- The IP-address workaround used the deprecated `v1 Endpoints` API. Replaced it with a `discovery.k8s.io/v1 EndpointSlice` example linked to the Service using the required `kubernetes.io/service-name` label.
- The PostgreSQL StatefulSet example used the official `postgres:15` image without the required `POSTGRES_PASSWORD` setting. Added an environment variable sourced from a Kubernetes Secret.
- The Kustomize example used deprecated `patchesStrategicMerge`. Replaced it with the current `patches` field.

## Review Notes
The local environment does not have `kubectl` installed, so CLI syntax was checked against official Kubernetes documentation rather than local `kubectl --help` output. The examples remain illustrative and assume referenced namespaces, Secrets, and external DNS names exist in the reader's environment.
