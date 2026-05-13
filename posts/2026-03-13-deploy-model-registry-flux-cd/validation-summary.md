# Validation Summary: How to Deploy a Model Registry with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD v2
- Kubernetes Deployments, Services, Ingress, Secrets, and Kustomize
- MLflow Tracking Server and Model Registry
- PostgreSQL backend store
- S3-compatible artifact storage with AWS S3 or MinIO
- ingress-nginx basic authentication
- Python MLflow SDK and scikit-learn

## Sources Consulted
- MLflow Tracking Server documentation: https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- MLflow REST API documentation: https://mlflow.org/docs/latest/api_reference/rest-api.html
- MLflow Model Registry documentation for aliases and deprecated stages: https://mlflow.org/docs/2.9.0/model-registry.html
- MLflow sklearn API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- MLflow official Docker image documentation: https://mlflow.org/docs/3.3.1/ml/docker/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx basic authentication documentation: https://kubernetes.github.io/ingress-nginx/examples/auth/basic/

## Issues Found
- The prerequisites described GCS as S3-compatible. GCS is supported by MLflow as an object store through its own `gs://` path and credentials model, but it is not S3-compatible for the shown `s3://` and AWS credential configuration. Changed the prerequisite to AWS S3 or MinIO.
- The ingress referenced `mlflow-basic-auth`, but the post never created that Secret. Added a `kubectl create secret generic mlflow-basic-auth` command with the required `auth` key used by ingress-nginx basic authentication.
- The official `ghcr.io/mlflow/mlflow:v2.11.3` image does not include the PostgreSQL and S3 Python drivers needed by the shown backend and artifact store configuration. Updated the deployment command to install `psycopg2-binary` and `boto3` before starting MLflow.
- The MLflow server command mixed proxied artifact serving with `--default-artifact-root`. MLflow documentation recommends using `--artifacts-destination` without `--default-artifact-root` when the tracking server proxies artifact access. Removed `--default-artifact-root`.
- The Kustomize `kustomization.yaml` snippet and the Flux `Kustomization` resource were shown as one multi-document YAML file, which would be invalid as a Kustomize configuration file. Split them into separate YAML snippets matching their different file paths.
- The Python model registration example referenced an undefined `model` variable. Added a minimal scikit-learn `LogisticRegression` model trained on the iris dataset before calling `mlflow.sklearn.log_model`.
- The promotion example used the deprecated model stage transition endpoint even though the post recommends aliases. Replaced it with the MLflow registered model alias REST endpoint and a `champion` alias.

## Review Notes
The deployment now remains technically correct for a self-contained tutorial, but production users should usually build a derived MLflow image with dependencies preinstalled instead of installing packages on every pod start.
