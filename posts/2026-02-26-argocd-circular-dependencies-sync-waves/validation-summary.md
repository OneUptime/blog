# Validation Summary: How to Handle Circular Dependencies in ArgoCD Sync Waves

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD sync waves and sync options
- Kubernetes Services and DNS
- Kubernetes Deployments and init containers
- Kubernetes admission webhooks
- Kubernetes RBAC
- GitOps deployment ordering

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Init Containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/validating-webhook-configuration-v1/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The init container example claimed to wait for a running dependency but only checked DNS resolution with `nslookup`. Changed the command to check TCP availability on port 8080 with `nc -z`, and updated the explanation accordingly.
- The webhook section said the webhook validates its own CRDs and that CRD creation fails when the webhook is unavailable. Updated the wording to custom resources, because the shown webhook rules apply to custom resources, not CRD objects.
- The webhook example referenced a webhook Service without showing a backing Service and used a cert-manager-specific controller image in a generic pattern. Replaced it with a generic operator Deployment, matching webhook Service, and ValidatingWebhookConfiguration.
- The RBAC example described a RoleBinding reference as if Kubernetes requires the referenced ServiceAccount to exist before the RoleBinding can be created. Updated the wording to describe the real ordering concern: workloads need the namespace, ServiceAccount, and binding to exist before using the permissions.
- The Replace sync option was described as deleting and recreating resources. Updated it to match Argo CD behavior: `Replace=true` uses `kubectl replace` or `kubectl create`; delete/create behavior belongs to force sync scenarios.

## Review Notes
The post is technically relevant and the remaining YAML snippets use current Kubernetes and Argo CD APIs. The examples are illustrative and omit production details such as RBAC for the operator, webhook TLS certificate management, and full Application sync policies.
