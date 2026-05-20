# Validation Summary: How to Audit Tenant Activities in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes audit logging and events
- Amazon EKS control plane logging
- Git and GitOps audit history
- Prometheus and Grafana
- Elasticsearch/OpenSearch log retention
- OIDC/SSO

## Sources Consulted
- Argo CD Security Considerations: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Argo CD command parameter ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD OIDC user management: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD metrics reference: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD GnuPG/source integrity verification: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver reference for event retention: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- AWS CLI EKS update-cluster-config reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-config.html
- Elasticsearch ILM migration guidance: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/migrating-8.0.html

## Issues Found
- Corrected the wording around Argo CD audit logging. Argo CD logs payloads for most API requests and emits Kubernetes Events; it does not provide a separate universal audit log for every API call.
- Removed the claim that Argo CD API logs include client source IP addresses. Official Argo CD docs state that client IP logging should happen at the proxy or ingress layer.
- Corrected the SSO identity claim. Argo CD can attribute actions to authenticated users where applicable, but group claims depend on the identity provider. Added `enableUserInfoGroups` and `userInfoPath` for Okta-style group lookup.
- Fixed the Kubernetes Event command to sort by `.metadata.creationTimestamp`, matching Kubernetes kubectl examples.
- Fixed the `apps/v1` Deployment example for the event exporter by adding the required `spec.selector` and matching pod template labels.
- Updated the commit signature section to clarify that project-level GnuPG verification is legacy and newer Argo CD versions are moving to Source Integrity Verification.
- Fixed the Grafana JSON example to use valid escaped double quotes in the PromQL label matcher.
- Replaced the PromQL alert's non-existent `dest_namespace` label on `argocd_app_sync_total` with the documented `name` label.
- Updated the Elasticsearch ILM example to remove the deprecated/no-op `freeze` action and use `readonly` instead.

## Review Notes
The guide remains version-sensitive around Argo CD source integrity because the latest docs describe GnuPG verification as deprecated in favor of newer source integrity policy support. The post now calls out that caveat without restructuring the guide.
