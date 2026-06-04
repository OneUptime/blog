# Validation Summary: Setting Up Elasticsearch Snapshot and Restore with S3-Compatible Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch snapshot and restore
- Elasticsearch S3 snapshot repositories
- Snapshot Lifecycle Management (SLM)
- Elastic Cloud on Kubernetes (ECK)
- Kubernetes Secrets and kubectl
- S3-compatible object storage, including AWS S3 and MinIO
- IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- Elastic Docs: Snapshot/restore repository plugins, https://www.elastic.co/docs/reference/elasticsearch/plugins/snapshotrestore-repository-plugins
- Elastic Docs 8.12: S3 repository plugin included in Elasticsearch, https://www.elastic.co/guide/en/elasticsearch/plugins/8.12/repository-s3-repository.html
- Elastic Docs: S3 repository settings, https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/s3-repository-settings
- Elastic Docs: S3 repository and S3-compatible services, https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/s3-repository
- Elastic Docs: Secure settings on ECK, https://www.elastic.co/docs/deploy-manage/security/k8s-secure-settings
- Elastic Docs: Secure settings and reloadable secure settings, https://www.elastic.co/docs/deploy-manage/security/secure-settings
- Elastic API Docs: Create snapshot API, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create
- Elastic API Docs: Verify snapshot repository API, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-verify-repository
- Elastic API Docs v8: Create or update SLM policy API, https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-slm-put-lifecycle
- Elastic Guide 8.19: Take snapshots and restore snapshots, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/snapshots-take-snapshot.html and https://www.elastic.co/guide/en/elasticsearch/reference/8.19/snapshots-restore-snapshot.html

## Issues Found
- The post said Elasticsearch 8.12.0 needed an init container to install `repository-s3`. Elastic's 8.12 documentation states the S3 repository plugin is included in Elasticsearch, so the init-container plugin installation example was removed and replaced with a normal ECK Elasticsearch deployment snippet.
- The introduction, repository registration step, and conclusion referred to plugin installation or the `repository-s3` plugin as a required setup component. These were updated to refer to built-in S3 repository support for the documented Elasticsearch version.
- The MinIO endpoint example used a host:port endpoint plus `s3.client.default.protocol`. Elastic's current S3 repository settings recommend a fully qualified endpoint URL with `http://` or `https://`; the example was updated to include `http://` directly in `s3.client.default.endpoint`.
- The S3-compatible storage example did not set a region. Elastic's S3 client settings note that S3-compatible services typically require an explicit region value, so the example now includes `s3.client.default.region`.
- The post described `chunk_size` as splitting large files into manageable chunks for network reliability. Elastic documents it as the maximum object size written to the repository, with larger files chunked into smaller objects, so the explanation was tightened.
- The security section said the Elasticsearch keystore encrypts secrets at rest. Elastic documents optional password protection for the keystore, so the wording was corrected to avoid overstating encryption behavior.
- The IRSA explanation said the S3 plugin gets temporary credentials from the instance metadata service. For IRSA, the more accurate description is that credentials are picked up through the AWS SDK credential chain, so that wording was corrected.

## Review Notes
The snapshot, restore, repository verification, SLM policy, `kubectl port-forward`, Kubernetes Secret, and ECK `secureSettings` examples are consistent with the official documentation reviewed. Future updates should re-check S3-compatible repository behavior against the Elasticsearch version in use, especially for Elasticsearch 9.x and later.
