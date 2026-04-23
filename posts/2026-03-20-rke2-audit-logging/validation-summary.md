# Validation Summary: How to Configure RKE2 Audit Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RKE2
- Kubernetes API server audit logging
- Kubernetes audit policy API (`audit.k8s.io/v1`)
- Kubernetes RBAC, authentication, authorization, and admission resources
- Grafana Loki
- Grafana Alloy
- Bash and Python JSON parsing

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-apiserver Audit Configuration API (`audit.k8s.io/v1`): https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes TokenRequest API reference: https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-request-v1/
- Kubernetes Node Authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/node/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 CIS Hardening Guide, API Server audit configuration: https://docs.rke2.io/security/hardening_guide
- Grafana Promtail pipeline stages and EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/stages/
- Grafana Alloy `loki.source.file` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki.source.file/
- Grafana Alloy `loki.process` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki.process/
- Grafana Alloy `loki.write` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/

## Issues Found
- The audit policy creation command used `sudo cat > /etc/rancher/rke2/audit-policy.yaml`, but shell redirection would still run as the unprivileged user. Changed it to `sudo tee ... > /dev/null` so the file can be written under `/etc/rancher/rke2`.
- Secret mutations were logged at `RequestResponse`, which would record secret request and response bodies. Changed secret logging to `Metadata` to avoid exposing secret values in audit logs.
- TokenReview and ServiceAccount token requests were logged at `RequestResponse`, which could record bearer tokens. Changed those rules to `Metadata`.
- The policy used `authentication.k8s.io` resource `tokenrequests`, but TokenRequest is served via the ServiceAccount token subresource endpoint. Replaced it with core resource `serviceaccounts/token`.
- The node status skip rule used `users: ["system:nodes"]`, but kubelets are in the `system:nodes` group and use usernames in the form `system:node:<nodeName>`. Changed the rule to `userGroups: ["system:nodes"]`.
- Skip rules for kube-proxy and node status updates appeared after broader service/node metadata rules, so they would not match because audit policies use the first matching rule. Moved the skip block before the broader metadata rules.
- The policy referenced `podsecuritypolicies`, which was removed in Kubernetes v1.25. Replaced it with current admission registration resources and kept network policy logging.
- The RKE2 log path used `/var/log/kubernetes/audit.log`, while RKE2 documents API audit logs under `/var/lib/rancher/rke2/server/logs/audit.log`. Updated the log path, directory creation, forwarding path, and query commands.
- The verification command piped multiple JSON Lines events into `python3 -m json.tool`, which expects one JSON document. Replaced it with a per-line JSON parser.
- The Loki forwarding example used Promtail, which is EOL as of March 2, 2026. Replaced it with a Grafana Alloy configuration using `loki.source.file`, `loki.process`, and `loki.write`.
- Several comments overstated what rules did, such as "privileged pod operations" and "CRD controller operations." Updated comments to match the actual matching behavior.

## Review Notes
- The post is now technically valid as a current RKE2/Kubernetes audit logging guide.
- The examples were reviewed statically against official documentation; no live RKE2 cluster was available in this workspace to restart or query.
- ConfigMap request-body logging can still expose sensitive values if teams store secrets in ConfigMaps. That is a policy choice rather than a syntax error, but production users should review audit levels against their own data handling rules.
