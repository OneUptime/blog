# Validation Summary: ArgoCD for Education: Multi-Tenant Lab Environments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet controller
- GitOps
- Kubernetes namespaces, RBAC, ServiceAccounts, ResourceQuota, LimitRange, NetworkPolicy, Services, and Deployments
- Helm charts and templates
- kubectl
- Prometheus Operator PrometheusRule

## Sources Consulted
- Argo CD ApplicationSet List generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Application deletion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Application-Deletion/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/auto_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/sync-options/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Helm chart template guide: https://helm.sh/docs/chart_template_guide/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The dynamic ApplicationSet example combined a Git generator and a List generator as separate generators, which would not let the List generator consume values from the Git file. Updated it to use a Matrix generator with Git plus List, matching the documented `elementsYaml` pattern.
- The dynamic ApplicationSet example used Go-template expressions without enabling `goTemplate`, and referenced `lab-group` with dot notation, which is invalid for a key containing a hyphen. Enabled `goTemplate`, added `goTemplateOptions`, and used `index` for the hyphenated key.
- The simpler List generator example used the older placeholder style while the corrected post now uses Go templating. Enabled `goTemplate` and updated placeholders to `{{.id}}`.
- The post claimed Argo CD would prune all student namespaces automatically while the examples only used `CreateNamespace=true`. Added a Namespace manifest to the Helm chart and clarified that namespace pruning depends on the namespace being included as a managed resource.
- The NetworkPolicy comment said pod egress was needed for pulling images. Image pulls are performed by kubelet/node infrastructure, not by the application pod's network path. Updated the comment to refer to docs and external lab endpoints, and added TCP 53 alongside UDP 53 for DNS.
- The workspace note said a `managed-by: student` label prevents Argo CD self-healing. Argo CD does not ignore managed resources solely because of that label. Updated the note to say resources created outside the chart are not auto-healed.

## Review Notes
- The RBAC example is namespace-scoped because it binds the built-in `edit` ClusterRole through a RoleBinding, but Kubernetes documents that `edit` can read Secrets and can allow running Pods as ServiceAccounts in that namespace. For real student clusters, consider a narrower custom Role.
- The service account token command is valid, but Kubernetes may return a token with a shorter or longer lifetime than the requested `--duration`, depending on API server configuration.
