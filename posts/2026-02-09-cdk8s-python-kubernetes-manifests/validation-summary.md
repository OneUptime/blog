# Validation Summary: How to Create Kubernetes Manifests Programmatically Using CDK8s with Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CDK8s
- Python
- Kubernetes Deployments, Services, StatefulSets, ConfigMaps, Namespaces, and PersistentVolumeClaims
- Prometheus Operator ServiceMonitor
- PostgreSQL and postgres_exporter

## Sources Consulted
- CDK8s Python getting started guide: https://cdk8s.io/docs/latest/get-started/python/
- CDK8s CLI import documentation: https://cdk8s.io/docs/latest/cli/import/
- CDK8s Python API reference for App, Chart, ApiObject, ApiObjectMetadata, and JsonPatch: https://cdk8s.io/docs/latest/reference/cdk8s/python/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started documentation for ServiceMonitor and Service selection behavior: https://prometheus-operator.dev/docs/developer/getting-started/
- Docker official PostgreSQL image documentation: https://hub.docker.com/_/postgres
- prometheus-community postgres_exporter documentation and releases: https://github.com/prometheus-community/postgres_exporter
- Astral uv installation documentation: https://docs.astral.sh/uv/getting-started/installation/

## Issues Found
- The setup commands omitted `uv`, which the current `cdk8s init python-app` template requires in a clean environment. Added the official `uv` installer command before project initialization.
- The nginx example used `/health` as a liveness probe path, but the stock `nginx:1.25` image does not expose that endpoint by default. Changed the probe path to `/`.
- The article stated that Python type checking catches errors too broadly. Updated the wording to clarify that generated bindings and static type checkers can catch many errors.
- The StatefulSet example passed `KubePersistentVolumeClaim` constructs into `volume_claim_templates`; generated CDK8s Python types expect `KubePersistentVolumeClaimProps` or dictionaries there. Replaced both PVC template entries with `KubePersistentVolumeClaimProps`.
- The PostgreSQL containers lacked `POSTGRES_PASSWORD`, which is required by the official Postgres image for initialization. Added the environment variable in the example containers.
- The optional "read replica" example used `REPLICA_MODE=true`, which is not recognized by the official Postgres image and does not configure replication. Reworded it as a second PostgreSQL instance for demonstrating conditionals.
- The primary StatefulSet referenced a governing Service name without defining the Service, and the optional second StatefulSet did the same. Added matching Kubernetes Services.
- The optional second StatefulSet had a PVC template without a matching `volumeMount`. Added the missing mount.
- The example used `k8s.KubeServiceMonitor`, but `ServiceMonitor` is a Prometheus Operator CRD and is not part of the default Kubernetes `k8s` import. Replaced it with CDK8s `ApiObject` plus `JsonPatch`.
- The ServiceMonitor endpoint referenced a `metrics` port without a matching Service port or metrics exporter. Added a postgres_exporter sidecar and matching named Service port.

## Review Notes
The examples are still tutorial-oriented and use simple literal credentials for readability. A production version should use Kubernetes Secrets for database passwords and a real PostgreSQL replication or operator-based setup instead of a hand-written demonstration StatefulSet.
