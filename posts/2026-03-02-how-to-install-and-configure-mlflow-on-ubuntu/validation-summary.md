# Validation Summary: How to Install and Configure MLflow on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Ubuntu
- Python
- MLflow
- PostgreSQL
- MinIO / S3-compatible artifact storage
- systemd
- Nginx
- HTTP Basic Authentication
- scikit-learn
- PyTorch

## Sources Consulted
- MLflow CLI documentation: https://mlflow.org/docs/latest/api_reference/cli.html
- MLflow backend store documentation: https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- MLflow tracking server documentation: https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- MLflow authentication documentation: https://mlflow.org/docs/latest/self-hosting/security/basic-http-auth/
- MLflow Model Registry workflow documentation: https://www.mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow scikit-learn API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- MLflow PyTorch API documentation: https://mlflow.org/docs/latest/python_api/mlflow.pytorch.html
- MLflow PyPI metadata: https://pypi.org/project/mlflow/
- MinIO Linux installation documentation: https://min.io/docs/minio/linux/operations/installation.html
- MinIO Client documentation: https://min.io/docs/minio/linux/reference/minio-mc.html
- Ubuntu PostgreSQL documentation: https://ubuntu.com/server/docs/how-to/databases/install-postgresql/
- Nginx HTTP Basic Authentication documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/
- Apache htpasswd documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- scikit-learn RandomForestClassifier documentation: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
- scikit-learn metrics documentation: https://scikit-learn.org/stable/api/sklearn.metrics.html

## Issues Found
- Updated the prerequisites from Ubuntu 20.04 / Python 3.9+ to Ubuntu 22.04 or 24.04 / Python 3.10+, because the current MLflow PyPI package requires Python >=3.10 and the apt-based install path does not provide Python 3.10 on Ubuntu 20.04 by default.
- Changed `mlflow.sklearn.log_model(model, "random-forest-model", ...)` and `mlflow.pytorch.log_model(model, "pytorch-model")` to use the current `name=` parameter. MLflow still accepts `artifact_path`, but official docs mark it deprecated.
- Fixed the local artifact directory ownership flow. The original command tried to chown files to the `mlflow` user before that user was created.
- Added installation of the MinIO `mc` client before using `mc alias set` and `mc mb`, because installing the MinIO server binary alone does not provide the `mc` command.
- Replaced `sudo chown ubuntu:ubuntu /data/minio` with `sudo chown "$USER":"$USER" /data/minio`, because a generic Ubuntu system is not guaranteed to have a user named `ubuntu`.
- Moved `sudo mkdir -p /etc/mlflow` before writing `/etc/mlflow/mlflow.env`; the original order would fail if `/etc/mlflow` did not exist.
- Added MLflow `--allowed-hosts` / `MLFLOW_SERVER_ALLOWED_HOSTS` configuration, matching current MLflow server security middleware requirements for hosts exposed beyond localhost.
- Updated the remote tracking URI examples to use the HTTPS Nginx endpoint and MLflow's documented `MLFLOW_TRACKING_USERNAME` / `MLFLOW_TRACKING_PASSWORD` environment variables for Basic Auth instead of embedding credentials in the URL.
- Replaced deprecated Model Registry stage APIs and `models:/Name/Production` loading with registered model aliases and `models:/Name@alias`, as MLflow 2.9.0 and later deprecate model stages in favor of aliases and tags.
- Added the missing `import mlflow` in the Model Registry snippet, which used `mlflow.register_model()` and `mlflow.pyfunc.load_model()`.

## Review Notes
The Nginx section provides the server block but does not include site enablement, certificate issuance, or reload commands. That is operationally incomplete, but the included Nginx directives and `htpasswd` usage are technically valid.
