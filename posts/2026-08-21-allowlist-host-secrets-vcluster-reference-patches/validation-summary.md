# Validation Summary: How to Allowlist Host Secrets into vCluster with Reference Patches

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- vCluster 0.36 on shared nodes
- Kubernetes Secrets
- vCluster host-to-tenant synchronization and `mappings.byName`
- vCluster custom-resource synchronization
- vCluster structured reference patches
- vCluster CLI
- Kubernetes `kubectl`, JSONPath, contexts, and RBAC
- Secret rotation and workload reload behavior

## Sources Consulted

- [vCluster v0.36.0 release](https://github.com/loft-sh/vcluster/releases/tag/v0.36.0)
- [vCluster: Sync Secrets from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/secrets)
- [vCluster: Sync custom resources from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/custom-resources)
- [vCluster: Patching synced resources](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/patching)
- [vCluster: Compare open source and Free tiers](https://www.vcluster.com/docs/vcluster/introduction/oss-vs-free)
- [vCluster CLI: `vcluster create --help`](https://www.vcluster.com/docs/vcluster/cli/vcluster_create)
- [vCluster: Deploy a tenant cluster as a Kubernetes pod](https://www.vcluster.com/docs/vcluster/deploy/control-plane/kubernetes-pod/basics)
- [vCluster: Access and expose vCluster](https://www.vcluster.com/docs/vcluster/manage/accessing-vcluster)
- [vCluster v0.36.0 configuration schema](https://github.com/loft-sh/vcluster/blob/v0.36.0/config/config.go)
- [vCluster v0.36.0 configuration validation](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/config/validation.go)
- [vCluster v0.36.0 generated from-host RBAC rules](https://github.com/loft-sh/vcluster/blob/v0.36.0/chart/templates/_rbac.tpl)
- [vCluster v0.36.0 built-in Pod Secret-reference translation](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/resources/pods/translate/translator.go#L680-L699)
- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes: Good practices for Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [Kubernetes: Using RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: RBAC good practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
- [Kubernetes: `kubectl create secret generic`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/)
- [Kubernetes: `kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes: JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes API concepts: resource versions](https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions)

## Issues Found

- The reference patch targeted `spec.credentialsSecretRef.name` while also supplying a full sibling namespace path and omitting `namePath`. That did not follow vCluster's structured-reference format. Changed the patch to target `spec.credentialsSecretRef` and added relative `namePath: name` and `namespacePath: namespace`, as required when a reference contains sibling name and namespace fields.
- The post described from-host custom-resource syncing as Enterprise-only. vCluster 0.36 includes custom-resource syncing and sync patches in the no-cost Free tier as well as paid tiers. Corrected the licensing explanation to distinguish the open-source Secret mapping from the Pro-image features that require vCluster Platform license validation.
- The deployment command used `--connect=false`, but the following unqualified `kubectl` commands were described as tenant-cluster checks. They would still have used the control-plane context. Saved and explicitly used the control-plane context, then added a helper that runs tenant commands through the documented `vcluster connect ... -- kubectl ...` form without switching contexts. The allowlist probe is now created and deleted on the control plane while its absence is checked in the tenant.
- `kubectl auth can-i update secret/db-credentials` could be mistaken for a test of vCluster's read-only synchronization behavior. Added an explanation that it checks only the current tenant identity's RBAC and can return `yes` even though tenant changes are not propagated to the control plane and are later reconciled.
- The RBAC prose implied that a workload ServiceAccount needs direct Secret `get` permission to consume the Secret. Kubernetes does not require that permission for `envFrom`, `secretKeyRef`, or Secret-volume consumption, and workload-creation permission can still expose namespace Secrets. Scoped the Role example to applications that call the Kubernetes API directly and added the necessary workload-creation and namespace-isolation caveat.

## Review Notes

- Exact `mappings.byName` entries constrain normal synchronization, but they do not necessarily reduce the vCluster syncer's control-plane RBAC to a single named object. Treat host RBAC and the mapping as separate controls, as the conclusion recommends.
- A changed tenant `resourceVersion` shows that the tenant object changed; it does not prove data equality and should not be compared numerically with the source object's resource version.
- The fictional `DatabaseConnection` CRD and source custom resource still must exist in the control-plane cluster as stated in the guide.
- The corrected vCluster configuration passed Helm lint and rendering against the official v0.36.0 chart. All YAML snippets parsed successfully, and all shell snippets passed syntax validation.
