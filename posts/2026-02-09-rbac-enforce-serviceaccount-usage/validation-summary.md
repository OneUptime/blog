# Validation Summary: How to Build RBAC Policies That Enforce Service Account Usage Instead of User

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- Kubernetes admission webhooks
- Kubernetes audit policies
- kubectl
- jq
- Flask
- Prometheus alerting

## Sources Consulted
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes audit documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver audit configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The opening text overstated that ServiceAccounts themselves rotate. Updated it to clarify that ServiceAccount tokens can rotate.
- The post implied user permissions always span multiple namespaces. Changed this to say they can span multiple namespaces when granted cross-namespace permissions.
- The RBAC Role combined `list` with `resourceNames`, which is easy to misuse because Kubernetes requires a matching `metadata.name` field selector for list/watch requests restricted by `resourceNames`. Changed the example to `get` for the named ConfigMap.
- The ServiceAccount token description missed the Kubernetes v1.22 projected-token behavior. Added that v1.22 and later uses short-lived projected tokens that kubelet rotates.
- The validating webhook used Flask's adhoc TLS certificate, which the API server would not trust. Updated the server example to use mounted TLS certificate files and added `caBundle` and port guidance to the webhook configuration.
- The webhook allowed any Secret with `token` in its name, which could allow user token Secrets. Changed the suspicious keyword list to include `token`.
- The audit policy used `users: ["system:serviceaccount:*"]`, but Kubernetes audit policy user matching is by authenticated user name, not a username glob. Changed it to `userGroups: ["system:serviceaccounts"]`.
- The automounting section overstated that disabling automatic token mounting prevents all API access. Clarified that it prevents automatic ServiceAccount token injection and only blocks API authentication if no other credential is present.
- The nested Markdown policy example had broken code fences. Replaced the outer fence with a four-backtick Markdown fence and corrected inner fence closures.
- The token rotation section used Kubernetes v1.24 as the projected token rotation version and recreated a generic Secret with a time-bound token. Updated the version wording and changed the legacy-token rotation example to recreate a `kubernetes.io/service-account-token` Secret.
- The Prometheus alert examples used `apiserver_audit_event_total` with labels that the Kubernetes metric does not expose. Changed the text to say these alerts require exported audit-event metrics and used a generic exporter metric name.
- The audit-log query explanation implied all non-ServiceAccount API calls are improper. Clarified that they are events to investigate.
- The conclusion overstated that admission webhooks prevent pods from using user credentials. Changed it to say webhooks can reject risky pod patterns.

## Review Notes
The article is technically relevant and accurate after correction. The admission webhook remains an illustrative heuristic; a production implementation should also inspect referenced Secrets or use a policy engine such as ValidatingAdmissionPolicy, Kyverno, or OPA Gatekeeper for stronger enforcement.
