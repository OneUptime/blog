# Validation summary

Reviewed the distinction between stable proxy paths and direct storage addresses. The migration plan preserves metadata and relative artifact layout, pauses writers for a consistent boundary, verifies controlled new writes, and explains why rollback after new writes needs reconciliation. The inventory is explicitly limited and cannot authorize deletion.

## Sources reviewed

- https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- https://mlflow.org/docs/latest/api_reference/python_api/mlflow.client.html#mlflow.client.MlflowClient.search_model_versions
- https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- https://mlflow.org/docs/latest/api_reference/python_api/mlflow.client.html#mlflow.client.MlflowClient.update_model_version
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html
- https://github.com/mlflow/mlflow/blob/v3.18.0/mlflow/store/artifact/mlflow_artifacts_repo.py

## Checks performed

Ran MLflow 3.18.0 with Python 3.11.13 as a local HTTP server using SQLite and a filesystem artifact destination. Logged and registered a synthetic model and set champion to version 1. The exact article inventory captured its logged-model source, resolved proxy URI, run URI and alias. Stopped the server, copied the complete artifact directory with matching file hashes, made the original root unavailable, and restarted the same endpoint/database with the new root. Version 1 still predicted 7 and the inventory matched. A new version 2 was logged and predicted 9 through the new destination while champion remained 1.

Confirmed refusal to overwrite inventory output. A separate mocked two-page result verified token traversal, numeric sorting and owner-only POSIX file permissions. Installed CLI help confirmed the shown server options; shell syntax and exact article Python were checked. The six-node/six-edge Mermaid graph passed structural review. The 1280x720 social image was generated and opened; three title lines fit.

## Limits

The live rehearsal was local loopback HTTP without TLS or authentication. It did not test S3 copying, encryption keys, IAM, lifecycle policies, production metadata backups, distributed replicas or online migration. The copy occurred with the single server stopped. Pagination across pages used a mock rather than hundreds of real versions. No production cleanup or destructive restoration was performed. Mermaid was not browser-rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
