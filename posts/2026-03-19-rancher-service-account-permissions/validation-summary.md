# Validation Summary: How to Manage Service Account Permissions in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes RBAC
- `kubectl`
- YAML manifests

## Sources Consulted
- Kubernetes Service Accounts: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Service Account administration: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Configure Service Accounts for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Using RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Accessing the Kubernetes API from a Pod: https://kubernetes.io/docs/tasks/run-application/access-api-from-pod/
- `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- `kubectl create token` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/#token
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Rancher kubectl shell / kubeconfig access: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Rancher secrets UI navigation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/secrets
- Rancher hardening guidance for disabling default service account token automounting: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/rancher-security/hardening-guides/rke1-hardening-guide

## Issues Found
- The Rancher UI instructions in Step 1 pointed to **Service Discovery > Services**, which is the wrong resource area for service accounts. I changed it to **More Resources > Core > ServiceAccounts**.
- The deployment example set `KUBERNETES_SERVICE_HOST` to `kubernetes.default.svc`. Kubernetes documents that in-cluster clients should either use official client libraries or the injected `KUBERNETES_SERVICE_HOST` / `KUBERNETES_SERVICE_PORT_HTTPS` values, and it does not guarantee a valid certificate for the `kubernetes.default.svc` hostname. I removed the misleading manual environment override.
- Step 5 described a `ClusterRoleBinding` as the pattern for access across "multiple namespaces". Kubernetes RBAC documentation states that `ClusterRoleBinding` grants access cluster-wide, across all namespaces. I corrected the wording to "across all namespaces".
- The audit example `kubectl auth can-i --list` omitted `-n production`, which would make the output depend on the current kubeconfig namespace instead of the namespace discussed in the post. I added `-n production`.
- The explanation after disabling token automount on the `default` service account implied that only a service account-level `automountServiceAccountToken: true` would re-enable mounting. Kubernetes documents that the Pod spec takes precedence, so I corrected the explanation to reflect pod-level explicit enablement.
- The Rancher UI instructions in Step 8 said to use **Storage > Secrets** to manage service accounts. In Kubernetes 1.24+ service account token secrets are not auto-created, so that path is not the primary place to manage service accounts. I updated the section to point to **More Resources > Core > ServiceAccounts** and kept **Secrets** only for manually created long-lived token secrets.

## Review Notes
- The post is technically sound after the corrections above.
- Rancher UI labels can vary slightly by version, but the corrected guidance matches Rancher's current Cluster Explorer and kubectl shell documentation.
- The cleanup loop in Step 10 only identifies service accounts unused by currently running Pods; it does not detect references from Deployments, Jobs, or CronJobs that may create Pods later.
