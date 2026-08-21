# How to Allowlist Host Secrets into vCluster with Reference Patches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Secret, Security, Synchronization

Description: Import only named host Secrets and keep custom-resource Secret references valid when namespaces and names change during synchronization.

---

Host-to-tenant Secret synchronization is powerful and therefore dangerous. A broad wildcard mapping such as `"shared-secrets/*": "platform/*"` can expose every Secret in the mapped control plane namespace. A safer design has two distinct controls: explicit entries in `mappings.byName` form the allowlist, and a reference patch tells vCluster how to rewrite a field in another synchronized object that points at an allowlisted Secret.

This guide targets vCluster **0.36** on shared nodes. From-host Secret mapping is available in the open-source tier. Custom-resource syncing and sync patches require the Pro image and vCluster Platform license validation, but v0.36 includes both in the no-cost Free tier as well as the paid tiers. Native Kubernetes references such as a Pod's `envFrom.secretRef` are already understood by vCluster and do not need this custom patch.

## Define the Data Boundary

Assume the platform owns these host objects:

```text
shared-secrets/team-a-db       Secret
shared-services/team-a-db     DatabaseConnection
```

Inside the tenant, they should appear as:

```text
platform/db-credentials       Secret
platform/database             DatabaseConnection
```

Do not map broad wildcard namespaces merely for convenience. Select the smallest set of objects and give each tenant its own source Secret. A shared Secret copied into multiple tenant APIs no longer has single-tenant confidentiality.

## Create the Host Secret Safely

Create it through your secret manager, External Secrets controller, Sealed Secrets workflow, or another controlled process. For a disposable lab only, save the control-plane context and use it explicitly:

```bash
export HOST_CTX="$(kubectl config current-context)"

kubectl --context="${HOST_CTX}" create namespace shared-secrets
kubectl --context="${HOST_CTX}" create secret generic team-a-db \
  --namespace shared-secrets \
  --from-literal=username=team-a \
  --from-literal=password='replace-me'
```

Avoid putting real secret values in Git, shell history, screenshots, or this `vcluster.yaml`. The configuration contains object names, not Secret data.

## Allowlist the Secret and the Referencing CR

Configure `vcluster.yaml`:

```yaml
sync:
  fromHost:
    secrets:
      enabled: true
      mappings:
        byName:
          "shared-secrets/team-a-db": "platform/db-credentials"
    customResources:
      databaseconnections.platform.example.com/v1:
        enabled: true
        scope: Namespaced
        mappings:
          byName:
            "shared-services/team-a-db": "platform/database"
        patches:
          - path: spec.credentialsSecretRef
            reference:
              apiVersion: v1
              kind: Secret
              namePath: name
              namespacePath: namespace
```

The Secret mapping is the allowlist. The custom resource mapping imports one read-only host object. The reference patch declares that `spec.credentialsSecretRef` is a structured `v1/Secret` reference. `namePath` and `namespacePath` identify the fields relative to that object. vCluster can then map `shared-secrets/team-a-db` to `platform/db-credentials` instead of leaving a broken host name in the tenant object.

The CRD must already exist in the control plane cluster. vCluster copies the selected CRD into the tenant API and automatically adds the read permissions needed for configured from-host custom resources.

Apply the configuration:

```bash
vcluster create team-a \
  --context "${HOST_CTX}" \
  --namespace team-a-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

## Verify the Imported Objects

Keep the control-plane context active and define a helper that runs each `kubectl` command through a temporary tenant connection:

```bash
tenant_kubectl() {
  vcluster connect team-a \
    --context "${HOST_CTX}" \
    --namespace team-a-vcluster \
    -- kubectl "$@"
}

tenant_kubectl get secret db-credentials -n platform
tenant_kubectl get databaseconnection database -n platform -o yaml
tenant_kubectl auth can-i update secret/db-credentials -n platform
```

The custom resource should contain the tenant-facing Secret name and namespace:

```yaml
spec:
  credentialsSecretRef:
    name: db-credentials
    namespace: platform
```

The `auth can-i` result describes only the current tenant identity's RBAC and may be `yes` for a tenant administrator; it does not make the sync bidirectional. From-host objects are read-only copies. Changes made inside the tenant do not persist back to the control plane cluster and will be reconciled. Rotate the source Secret through the platform-owned secret workflow, then verify the tenant copy's resource version and application reload behavior.

Compare only metadata or a digest when validating rotation; do not print plaintext values:

```bash
tenant_kubectl get secret db-credentials -n platform \
  -o jsonpath='{.metadata.resourceVersion}{"\n"}'
```

## Test That the Allowlist Is Actually Narrow

Create another harmless Secret in the source namespace, then verify it does not appear in the tenant:

```bash
kubectl --context="${HOST_CTX}" create secret generic not-for-team-a \
  -n shared-secrets \
  --from-literal=test=value

tenant_kubectl get secret not-for-team-a -n platform
# Expected: NotFound

kubectl --context="${HOST_CTX}" delete secret not-for-team-a -n shared-secrets
```

Also test RBAC inside the tenant. The Role below grants an application direct Kubernetes API `get` access to this one Secret. Pods using `envFrom` or a Secret volume do not need their ServiceAccount to have `get`; anyone who can create a Pod in `platform` can still mount and expose its Secrets, so restrict workload creation and use separate namespaces or admission controls where needed.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: read-db-credentials
  namespace: platform
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["db-credentials"]
    verbs: ["get"]
```

When direct API access is required, bind this Role to the intended ServiceAccount, not to every authenticated tenant user.

## Common Failure Modes

- The Secret does not appear: check the exact `host-namespace/name` mapping, vCluster RBAC, and control-plane logs.
- The custom resource appears but retains the host Secret name: check the structured patch path and the relative `namePath` and `namespacePath` fields.
- The CR does not appear: confirm the CRD resource plural, version, scope, and mapping.
- A tenant edit disappears: expected; from-host copies are read-only.
- A second Secret unexpectedly appears: inspect for wildcard mappings, another sync rule, or an operator that independently copies it.
- The application does not reload after rotation: Secret synchronization worked, but the application may read credentials only at startup. Add an application-specific reload mechanism or controlled rollout.

Reference patches preserve object relationships; they do not authorize access. Keep the mapping, host RBAC, tenant RBAC, and secret-manager policy as separate reviewed controls.

## Official Documentation

- [vCluster: Sync Secrets from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/secrets)
- [vCluster: Sync custom resources from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/custom-resources)
- [vCluster: Reference patches](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/patching)
- [vCluster: Compare open source and Free tiers](https://www.vcluster.com/docs/vcluster/introduction/oss-vs-free)
- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes: Using RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

## Conclusion

Use explicit Secret mappings as the allowlist and reference patches only where a custom resource carries a Secret name that vCluster must translate. Then layer tenant RBAC and controlled rotation on top. A correctly rewritten reference is useful only when the underlying data boundary remains narrow.
