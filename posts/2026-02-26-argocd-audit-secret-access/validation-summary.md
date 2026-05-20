# Validation Summary: How to Audit Secret Access in ArgoCD Managed Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes audit logging
- Kubernetes RBAC
- Amazon EKS
- AWS CloudTrail
- AWS CloudWatch Logs and alarms
- AWS Secrets Manager
- HashiCorp Vault audit devices
- Falco runtime security rules and Helm chart configuration
- OPA Gatekeeper
- OpenTelemetry Collector
- OneUptime OTLP ingestion
- jq and shell commands

## Sources Consulted
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD secret management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/secret-management/
- Falco custom rules documentation: https://falco.org/docs/concepts/rules/default-custom/
- Falco rules reference: https://falco.org/docs/reference/rules/
- AWS EKS update-cluster-config CLI reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-config.html
- AWS Secrets Manager CloudTrail documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudtrail.html
- AWS CloudTrail lookup-events documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-cli.html
- AWS CloudWatch Logs metric filter documentation: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutMetricFilter.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry configuration data model: https://opentelemetry.io/docs/specs/otel/configuration/data-model/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Kubernetes audit policy used `RequestResponse` for Secrets while saying it would not include secret data. Kubernetes documents that `RequestResponse` logs request and response bodies, so this could leak Secret contents. Changed Secret audit rules to `Metadata` level.
- The Kubernetes audit log parsing command claimed to search the last hour but did not pass a time filter. Added `--since=1h` to the `kubectl logs` command.
- The Argo CD ConfigMap described `server.rbac.log.enforce.enable` as RBAC logging. That parameter is not an audit logging setting and is obsolete for current Argo CD behavior. Replaced it with controller log level and JSON format settings.
- The Falco Helm values used `rulesFile`; official Falco chart documentation uses `falco.rules_files`. Updated the key.
- The Falco environment-variable rule claimed to detect reading secret environment variables. Falco can detect the process behavior shown, not arbitrary environment-variable reads, so the rule and description now refer to suspicious environment dumps.
- The Gatekeeper example attempted to enforce `get` access to Secrets. Kubernetes admission controllers do not process read requests such as `get`, `list`, or `watch`, so Gatekeeper cannot enforce or audit Secret reads. Replaced the primary example with Kubernetes RBAC and `kubectl auth can-i`, and kept Gatekeeper only as an admission-time guardrail for Secret creation/update.
- The OpenTelemetry attributes processor attempted to set `cluster.name` with `from_attribute: CLUSTER_NAME`, which copies an existing attribute rather than reading an environment variable. Changed it to `value: "${env:CLUSTER_NAME}"`.
- The OneUptime OTLP HTTP exporter example omitted the JSON encoding and content type documented by OneUptime. Added `encoding: json` and the `Content-Type: application/json` header.
- The summary and description still referenced OPA as the access-control enforcement layer after replacing the invalid read-access example. Updated them to Kubernetes RBAC.

## Review Notes
The compliance-report script remains illustrative because it contains placeholder commands such as `kubectl logs ...`; this is acceptable as pseudo-code, but a production version should replace those placeholders with concrete log source queries.
