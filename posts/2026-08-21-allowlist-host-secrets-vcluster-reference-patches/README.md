# How to Allowlist Host Secrets into vCluster with Reference Patches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Secret, Security, Synchronization

Description: Import only named host Secrets and keep custom-resource Secret references valid when namespaces and names change during synchronization.

---

Host-to-tenant Secret synchronization is powerful and therefore dangerous. A broad wildcard mapping such as `"shared-secrets/*": "platform/*"` can expose every Secret in the mapped control plane namespace. A safer design has two distinct controls: explicit entries in `mappings.byName` form the allowlist, and a reference patch tells vCluster how to rewrite a field in another synchronized object that points at an allowlisted Secret.

This guide targets vCluster **0.36** on shared nodes. From-host Secret mapping itself is available independently, but the current v0.36 documentation marks `sync.fromHost.customResources` Enterprise-only; the fictional `DatabaseConnection` half of this example therefore requires a plan that includes custom-resource syncing. Native Kubernetes references such as a Pod's `envFrom.secretRef` are already understood by vCluster and do not need this custom patch.

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

Create it through your secret manager, External Secrets controller, Sealed Secrets workflow, or another controlled process. For a disposable lab only:

```bash
kubectl create namespace shared-secrets
kubectl create secret generic team-a-db \
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
          - path: spec.credentialsSecretRef.name
            reference:
              apiVersion: v1
              kind: Secret
              namespacePath: spec.credentialsSecretRef.namespace
```

The Secret mapping is the allowlist. The custom resource mapping imports one read-only host object. The reference patch declares that `spec.credentialsSecretRef.name` names a `v1/Secret`, and `namespacePath` points to the sibling namespace field. vCluster can then map `shared-secrets/team-a-db` to `platform/db-credentials` instead of leaving a broken host name in the tenant object.

The CRD must already exist in the control plane cluster. vCluster copies the selected CRD into the tenant API and automatically adds the read permissions needed for configured from-host custom resources.

Apply the configuration:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

## Verify the Imported Objects

In the tenant cluster:

```bash
kubectl get secret db-credentials -n platform
kubectl get databaseconnection database -n platform -o yaml
kubectl auth can-i update secret/db-credentials -n platform
```

The custom resource should contain the tenant-facing Secret name and namespace:

```yaml
spec:
  credentialsSecretRef:
    name: db-credentials
    namespace: platform
```

From-host objects are read-only copies. Changes made inside the tenant do not persist back to the control plane cluster and will be reconciled. Rotate the source Secret through the platform-owned secret workflow, then verify the tenant copy's resource version and application reload behavior.

Compare only metadata or a digest when validating rotation; do not print plaintext values:

```bash
kubectl get secret db-credentials -n platform \
  -o jsonpath='{.metadata.resourceVersion}{"\n"}'
```

## Test That the Allowlist Is Actually Narrow

Create another harmless Secret in the source namespace, then verify it does not appear in the tenant:

```bash
kubectl create secret generic not-for-team-a \
  -n shared-secrets \
  --from-literal=test=value

kubectl get secret not-for-team-a -n platform
# Expected: NotFound
```

Delete the lab Secret afterward. Also test RBAC inside the tenant: only the workload service account that needs the credential should be able to read it. Namespace membership alone is not an authorization policy.

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

Bind this Role to the intended ServiceAccount, not to every authenticated tenant user.

## Common Failure Modes

- The Secret does not appear: check the exact `host-namespace/name` mapping, vCluster RBAC, and control-plane logs.
- The custom resource appears but retains the host Secret name: check the patch path and the referenced namespace field.
- The CR does not appear: confirm the CRD resource plural, version, scope, and mapping.
- A tenant edit disappears: expected; from-host copies are read-only.
- A second Secret unexpectedly appears: inspect for wildcard mappings, another sync rule, or an operator that independently copies it.
- The application does not reload after rotation: Secret synchronization worked, but the application may read credentials only at startup. Add an application-specific reload mechanism or controlled rollout.

Reference patches preserve object relationships; they do not authorize access. Keep the mapping, host RBAC, tenant RBAC, and secret-manager policy as separate reviewed controls.

## Official Documentation

- [vCluster: Sync Secrets from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/secrets)
- [vCluster: Sync custom resources from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/custom-resources)
- [vCluster: Reference patches](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/patching)
- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes: Using RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

## Conclusion

Use explicit Secret mappings as the allowlist and reference patches only where a custom resource carries a Secret name that vCluster must translate. Then layer tenant RBAC and controlled rotation on top. A correctly rewritten reference is useful only when the underlying data boundary remains narrow.
