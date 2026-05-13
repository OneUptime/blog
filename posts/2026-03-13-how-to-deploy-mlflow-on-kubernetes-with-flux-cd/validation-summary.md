# Validation Summary: How to Deploy MLflow on Kubernetes with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MLflow tracking server and Python tracking APIs
- MLflow basic authentication
- Bitnami MLflow Helm chart
- Bitnami PostgreSQL and MinIO subcharts
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes Secrets, Namespaces, Deployments, Ingress, and PersistentVolumeClaims
- S3-compatible artifact storage

## Sources Consulted
- Bitnami MLflow Helm chart README and values: https://github.com/bitnami/charts/tree/main/bitnami/mlflow
- Bitnami MLflow chart templates: https://github.com/bitnami/charts/tree/main/bitnami/mlflow/templates
- Bitnami PostgreSQL Helm chart values: https://github.com/bitnami/charts/tree/main/bitnami/postgresql
- Bitnami MinIO Helm chart values: https://github.com/bitnami/charts/tree/main/bitnami/minio
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux `reconcile helmrelease` CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- MLflow basic HTTP authentication documentation: https://mlflow.org/docs/latest/self-hosting/security/basic-http-auth/
- MLflow sklearn API reference: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The Flux HelmRelease used `spec.createNamespace`, which is not a valid HelmRelease field. Moved it to `spec.install.createNamespace`.
- The Bitnami chart source used the legacy HTTP chart repository and a `1.x` chart constraint. Updated the example to use Bitnami's OCI Helm repository and a current `5.x` MLflow chart constraint.
- The Secret used keys that did not match the current Bitnami MLflow and PostgreSQL chart expectations. Updated the Secret to include `postgres-password`, `password`, `admin-user`, `admin-password`, and `flask-server-secret-key`.
- The Secret was created in the `mlflow` namespace before the tutorial created that namespace. Added a Namespace manifest to the secrets snippet.
- MLflow authentication was enabled without configuring the required Flask server secret key. Added `existingSecretFlaskServerSecretKey`.
- The S3 settings were supplied through generic tracking environment variables, but the Bitnami chart uses top-level `externalS3` values to generate the server arguments and S3 credentials. Replaced the ignored environment-variable approach with `externalS3`.
- The example enabled two tracking replicas while leaving tracking persistence at the chart default. Disabled tracking persistence so the example does not depend on a shared ReadWriteMany volume for the tracking server pods.
- The tutorial deployed the chart's example `run` workload even though the guide only describes a tracking server. Added `run.enabled: false`.
- The ingress annotations referenced an `mlflow-basic-auth` Secret that the tutorial never created and duplicated MLflow's own basic authentication. Removed those ingress basic-auth annotations.
- The MinIO alternative used a separate MinIO HelmRelease and attempted to use `valueFrom` inside Helm values, which Helm does not evaluate. Replaced it with the Bitnami MLflow chart's bundled MinIO configuration using `auth.existingSecret`.
- The Python client example omitted credentials for an authenticated MLflow tracking server. Added `MLFLOW_TRACKING_USERNAME` and `MLFLOW_TRACKING_PASSWORD`.
- The Python model logging example used the positional artifact path style. Updated it to use the current `name` parameter while keeping `registered_model_name`.
- The log command selected `app.kubernetes.io/name=mlflow-tracking`, but the Bitnami tracking pods are selected by component labels. Updated it to `app.kubernetes.io/component=tracking`.
- The prerequisites listed GCS as S3-compatible storage. Updated the wording to AWS S3 or MinIO because the Bitnami chart has separate external GCS settings.

## Review Notes
- Flux documentation notes that OCI `HelmRepository` support is in maintenance mode and recommends `OCIRepository` for improved OCI support. The updated example remains valid for the HelmRepository pattern used by the post.
- The external S3 example uses `s3.amazonaws.com`; production AWS deployments should generally use the regional S3 endpoint appropriate for the bucket.
- The example is still intentionally concise. Production deployments should add backup/restore procedures, chart version pinning to an exact tested version, secret rotation, and tighter network policies.
