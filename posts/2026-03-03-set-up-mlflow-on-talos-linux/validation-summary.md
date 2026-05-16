# Validation Summary: How to Set Up MLflow on Talos Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Kubernetes
- MLflow
- PostgreSQL
- MinIO
- PyTorch
- kubectl
- cert-manager
- NGINX Ingress

## Sources Consulted
- MLflow CLI documentation: https://mlflow.org/docs/latest/api_reference/cli.html
- MLflow tracking server architecture: https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- MLflow backend store documentation: https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- MLflow artifact store documentation: https://mlflow.org/docs/latest/ml/tracking/artifact-stores/
- MLflow Python client API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.client.html
- MLflow model registry workflow documentation: https://www.mlflow.org/docs/latest/ml/model-registry/workflow/
- MinIO `mc anonymous set` documentation: https://docs.min.io/aistor/reference/cli/mc-anonymous/mc-anonymous-set/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres
- SQLAlchemy PostgreSQL dialect documentation: https://docs.sqlalchemy.org/20/dialects/postgresql.html

## Issues Found
- The MinIO bucket policy command used `mc policy set download`, which is outdated in current MinIO client documentation. Changed it to `mc anonymous set download`.
- The MLflow server container used PostgreSQL and S3-compatible artifact storage without ensuring the Python database and S3 client libraries were present. Updated the container command to install `psycopg2-binary` and `boto3` before starting `mlflow server`.
- The training Job mounted a `training-scripts` ConfigMap that the guide never created. Added the `kubectl create configmap training-scripts --from-file=train_with_mlflow.py` command before the Job manifest.
- The model registry example used model stages and `transition_model_version_stage`, which MLflow documents as deprecated since MLflow 2.9.0. Updated the example to use `set_registered_model_alias`.
- The MinIO backup command assumed the `myminio` alias already existed on the local machine, even though the earlier alias was created inside a temporary Kubernetes pod. Added a local port-forward and `mc alias set` before `mc mirror`.

## Review Notes
- The post pins the MLflow server image to `v2.10.0`, while the broader MLflow documentation has moved through later releases. The corrected registry example avoids the deprecated stage workflow and is more forward-compatible.
- The examples are suitable for a tutorial, but a production deployment should normally build a custom MLflow image with dependencies preinstalled instead of installing packages at container startup.
