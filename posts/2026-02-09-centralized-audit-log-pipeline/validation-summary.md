# Validation Summary: How to Build a Centralized Audit Log Pipeline for Kubernetes API Server Events

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes API server audit logging
- Kubernetes audit policies
- kubeadm static Pod API server configuration
- Fluent Bit tail, parser, Loki, and S3 outputs
- Grafana Loki storage, retention, ruler alerts, and LogQL
- Amazon S3 lifecycle policies

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes audit.k8s.io/v1 API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit parser documentation: https://docs.fluentbit.io/manual/2.2/pipeline/parsers/configuring-parser
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Fluent Bit S3 output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/s3
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Amazon S3 lifecycle configuration examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html

## Issues Found
- The audit policy placed a broad `Metadata` rule before all specific rules. Kubernetes audit rules are evaluated in order and the first matching rule sets the level, so the later `None`, `Request`, and `RequestResponse` rules would not take effect. Moved the catch-all rule to the end.
- The Fluent Bit ConfigMap referenced `Parsers_File parsers.conf` and `Parser json`, but the mounted ConfigMap did not provide `parsers.conf`. Added a JSON parser definition so the tail input can parse Kubernetes audit JSON lines.
- The Loki example used deprecated BoltDB Shipper / schema v11 / Table Manager retention settings. Updated it to the current recommended TSDB store with schema v13 and compactor-based retention.
- The unauthorized-access LogQL examples matched all 4xx responses, including non-authentication errors such as 404. Narrowed those examples to 401 and 403 responses.
- The article claimed the pipeline captured all API server events even though the sample policy intentionally filters some events. Reworded those claims to say it captures events selected by the audit policy.
- The S3 lifecycle policy block was labeled as YAML even though the snippet is JSON. Changed the code fence language to `json`.

## Review Notes
The examples still assume supporting infrastructure exists, including the `logging` namespace, the Fluent Bit service account, Loki deployment, object storage credentials, and appropriate RBAC/IAM. Those assumptions are common for a focused pipeline article, but a future expansion could show the complete deployable manifests.
