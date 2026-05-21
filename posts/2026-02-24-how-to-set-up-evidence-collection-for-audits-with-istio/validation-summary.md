# Validation Summary: How to Set Up Evidence Collection for Audits with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Kubernetes and CronJobs
- Kubernetes audit logs
- Prometheus and PromQL
- Grafana dashboards
- Fluent Bit S3 output
- AWS S3 storage classes
- Bash, jq, OpenSSL, and GPG

## Sources Consulted
- Istio security API reference for PeerAuthentication, RequestAuthentication, and AuthorizationPolicy: https://istio.io/latest/docs/reference/config/security/
- Istio traffic management API reference for DestinationRule, VirtualService, Gateway, and Sidecar: https://istio.io/latest/docs/reference/config/networking/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy access logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio plug-in CA certificate documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Fluent Bit S3 output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/s3
- AWS CLI S3 cp documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The certificate health commands assumed the `cacerts` secret exists for every Istio installation. Istio documents `cacerts` for the plugged-in CA workflow, while the default install can generate its own self-signed CA. Updated the comments to state that these commands apply when using Istio's plugged-in CA secret.
- The certificate section claimed a single command could prove certificate validity throughout the whole period. Updated the wording to say the command should be run daily to provide period evidence.
- The non-GitOps change evidence example used Kubernetes Events as if they were reliable audit history and could identify who changed a policy. Kubernetes audit logs are the authoritative mechanism for answering who did what and when. Replaced the Events command with a `jq` query over kube-apiserver audit logs.
- The access-log extraction assumed JSON-formatted Istio proxy logs and a source identity field without saying so. Updated the text to require JSON access logging with a format that includes the source principal, and changed the `jq` command to safely parse JSON log lines from mixed proxy output.

## Review Notes
- The configuration snapshot commands use current Istio resource kinds and Kubernetes CLI patterns.
- The Prometheus API examples use the stable `/api/v1` HTTP API and Istio's documented `istio_requests_total` metric and `connection_security_policy` label.
- The Fluent Bit S3 output options and AWS S3 storage class are current, but production deployments should also configure RBAC, credentials, retention policy, bucket immutability/Object Lock, and failure alerting.
