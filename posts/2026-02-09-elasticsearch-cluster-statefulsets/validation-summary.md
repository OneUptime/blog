# Validation Summary: How to deploy Elasticsearch cluster on Kubernetes with StatefulSets

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Elasticsearch 8.11
- Kubernetes StatefulSets, Deployments, Services, Secrets, StorageClasses, and PodDisruptionBudgets
- AWS EBS CSI storage
- Elasticsearch TLS certificates and security settings
- Elasticsearch snapshot repositories on S3
- Prometheus Elasticsearch exporter

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Elastic Elasticsearch node role settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/node-settings
- Elastic Elasticsearch discovery and cluster formation settings: https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-discovery-settings.html
- Elastic Elasticsearch security settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Elastic `elasticsearch-certutil` documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/certutil.html
- Elastic basic security plus HTTPS setup: https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security-plus-https
- Elastic S3 snapshot repository documentation: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/s3-repository
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Prometheus community Elasticsearch exporter documentation: https://github.com/prometheus-community/elasticsearch_exporter

## Issues Found
- The StorageClass used the removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Changed it to the AWS EBS CSI provisioner `ebs.csi.aws.com` and updated the filesystem parameter key to `csi.storage.k8s.io/fstype`.
- The examples used HTTPS URLs and probes but only enabled transport TLS. Added `xpack.security.http.ssl.enabled` and `xpack.security.http.ssl.keystore.path` to each Elasticsearch node example.
- The readiness probes used unauthenticated HTTPS cluster-health requests. With Elasticsearch security enabled, those probes would fail with authentication errors, so they were changed to TCP readiness checks.
- `cluster.initial_master_nodes` was also set on non-master nodes. Removed it from data nodes and clarified that the master setting is only for the first cluster bootstrap.
- The certificate command ran `elasticsearch-certutil cert` without providing a CA or self-signed option. Added a CA generation command and used that CA when generating the PKCS#12 certificate.
- Secret creation targeted the `logging` namespace before ensuring the namespace existed. Added an idempotent namespace creation command.
- Verification and snapshot commands referenced `$ELASTIC_PASSWORD` inside `kubectl exec`, but that variable would not be available to the shell running `curl` in the example. Replaced it with command substitution that reads the Kubernetes Secret.
- Removed the `ulimit` init container because init containers do not change process limits for the main Elasticsearch container.

## Review Notes
- Elasticsearch 8.11.0 is no longer the latest Elasticsearch release, but the post explicitly uses that version and the corrected examples are valid for the documented configuration pattern.
- The S3 snapshot example assumes the cluster has usable AWS credentials through its runtime environment or an Elasticsearch keystore configuration.
- For production Kubernetes deployments, Elastic Cloud on Kubernetes is still the recommended operator-based approach, but the StatefulSet walkthrough remains technically relevant.
