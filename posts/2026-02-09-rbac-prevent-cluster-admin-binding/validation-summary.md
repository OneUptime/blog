# Validation Summary: Use RBAC Policies That Prevent Binding Cluster-Admin Role to Regular Users

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes admission webhooks
- Kubernetes audit logging
- kubectl
- jq
- Prometheus metrics
- Python Flask

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver audit configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kubectl create clusterrolebinding reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_clusterrolebinding/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- The RBAC escalation caveat incorrectly implied that a subset of dangerous permissions was enough to bind `cluster-admin`. Updated it to mention the specific RBAC `bind` and `escalate` permissions documented by Kubernetes.
- The expected ClusterRole audit output was too absolute for default and distribution-specific roles. Changed it to say `cluster-admin` is typical and system/controller roles may appear depending on the cluster.
- The webhook server used Flask `ssl_context='adhoc'` while the Kubernetes webhook configuration requires a stable certificate chain matching `caBundle`. Updated the example to use mounted certificate and key files and clarified that the webhook server Service must be deployed with a certificate signed by that CA.
- The audit policy included `responseStatus`, which is an audit event field, not a valid audit policy rule selector. Removed the invalid rule and kept the valid RequestResponse policy for ClusterRoleBinding changes.
- The Prometheus alert queried labels that `apiserver_audit_event_total` does not expose. Replaced it with a valid `apiserver_admission_webhook_rejection_count` alert for rejections by the configured validating webhook.
- Two `jq` audit snippets iterated over binding subjects in a way that could emit misleading rows or omit ServiceAccount namespaces. Rewrote them to emit one row per matched subject.
- The nested Markdown example had malformed code fences and an extra trailing empty code block. Repaired the fences using a four-backtick outer block.

## Review Notes
The webhook and emergency-access examples remain illustrative and would still need production hardening, including a real Deployment or equivalent workload, Service, certificate management, authentication/authorization for webhook traffic where appropriate, operational monitoring, and a more robust break-glass revocation workflow.
