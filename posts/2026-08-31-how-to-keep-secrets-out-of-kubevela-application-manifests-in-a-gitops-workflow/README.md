# How to Keep Secrets Out of KubeVela Application Manifests in a GitOps Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Secrets, GitOps, Application Delivery

Description: Materialize Kubernetes Secrets from a dedicated secret-management system and let KubeVela Applications reference names and keys without storing plaintext in Git.

---

Base64 is encoding, not encryption. Committing a Kubernetes `Secret` with base64-encoded values exposes credentials to everyone and every system that can read Git history. A safer GitOps design stores only a secret **reference** or ciphertext in Git, lets a dedicated controller materialize a namespaced Kubernetes Secret, and has the KubeVela component consume that Secret by name and key.

KubeVela does not need to own the secret value. Its current `webservice` definition supports `env[].valueFrom.secretKeyRef` and secret volume references. The secret-management controller owns the `Secret`; KubeVela owns the Pod template reference.

## Choose one secret materialization pattern

Common approaches are:

- an external-secrets controller reads a managed vault and creates Kubernetes Secrets;
- a secrets-store CSI driver mounts values from an external provider, optionally syncing a Secret;
- Sealed Secrets stores cluster-encrypted `SealedSecret` resources in Git; or
- SOPS encrypts selected manifest fields and a trusted GitOps integration decrypts only during apply.

Choose according to threat model, rotation, disaster recovery, multi-cluster operation, and key custody. Do not layer several controllers over the same Secret name. One system should own each Secret.

This example uses the External Secrets Operator API shape; provider details vary. Install and pin the controller separately, configure its identity with least privilege, and consult the provider's official documentation.

## Declare a secret reference, not a secret

An `ExternalSecret` can name a `SecretStore`, select a remote key, and target a Kubernetes Secret:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: orders-database
  namespace: orders
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: SecretStore
    name: production-vault
  target:
    name: orders-database
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: production/orders/database
        property: password
```

Verify the API version against the installed CRD; older controller versions may use a different served version. The Git manifest contains a vault path, which can still reveal system structure, but not the password. Restrict access to `SecretStore` resources and provider identities so a tenant cannot redirect a high-privilege store to arbitrary remote keys.

Wait for the controller to materialize the Secret:

```bash
kubectl get externalsecret orders-database --namespace orders
kubectl describe externalsecret orders-database --namespace orders
kubectl get secret orders-database --namespace orders
```

Do not print the Secret with `-o yaml` during routine verification; command output and terminal logs are often retained.

## Reference the Secret from KubeVela

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: orders
  namespace: orders
spec:
  components:
    - name: api
      type: webservice
      properties:
        image: ghcr.io/example/orders@sha256:<verified-digest>
        ports:
          - name: http
            port: 8080
        env:
          - name: DATABASE_PASSWORD
            valueFrom:
              secretKeyRef:
                name: orders-database
                key: password
```

Replace the image placeholder with a real digest. Confirm fields with `vela show webservice`, because component definitions can be customized. The `Secret` must be in the Pod's namespace; Kubernetes intentionally prevents ordinary cross-namespace Secret references.

For file-based credentials, use the installed definition's secret volume schema and mount only the needed keys. Prefer files for credentials that can be re-read because environment variables usually remain fixed until the Pod restarts and can leak through crash reports or child processes.

## Order reconciliation without embedding values

GitOps should install in layers:

1. secret-management CRDs and controller;
2. provider identity and `SecretStore` managed by the platform team;
3. namespace and `ExternalSecret` or encrypted secret object;
4. KubeVela Application.

Argo CD sync waves can order the first application of these Git objects, but readiness still matters. A custom KubeVela workflow can wait on an infrastructure Application, or the workload can fail safely until the Secret appears. Do not put the secret value into a workflow output or Application status to pass it.

When a Secret is required at Pod admission, a missing key causes a clear Pod event. Inspect events without revealing data:

```bash
vela status orders --namespace orders --tree --detail
kubectl get events --namespace orders --sort-by=.lastTimestamp
kubectl describe pod --namespace orders <pod-name>
```

## Rotate without changing the Application manifest

Rotate the value in the external vault. The secret controller refreshes the Kubernetes Secret according to its policy. Then decide how the workload observes it:

- mounted Secret volumes update eventually, but the application must re-read the file;
- environment variables require a new Pod;
- some operators watch Secret resource versions and trigger rollout; or
- a controlled release can change a nonsecret restart annotation.

Test rotation and revocation. “The Secret object changed” does not prove connections were recreated or the old credential stopped working. Avoid logging checksums derived from low-entropy secrets because they can aid guessing.

## Protect the Kubernetes Secret layer

Even with no plaintext in Git, the value exists in the cluster. Kubernetes' official good practices recommend encryption at rest, least-privilege RBAC, restricted Secret access, and avoiding broad list/watch permission. Also:

- isolate namespaces and ServiceAccounts;
- disable automatic ServiceAccount token mounts where unnecessary;
- prevent application teams from reading controller/provider credentials;
- audit Secret access without logging values;
- avoid exposing secrets in command-line arguments and logs; and
- back up encryption keys or external-vault recovery material according to policy.

Anyone who can create a Pod in a namespace can generally cause that Pod to expose any Secret in the namespace, even without direct `get secret` permission; Kubernetes does not perform a Secret-read RBAC check for each Pod volume reference. Isolate namespaces and use admission policy where needed. Protect workload creation, not only direct Secret reads.

## Multi-cluster considerations

KubeVela can dispatch the same Application to several clusters, but a Secret reference is resolved in each destination. Install and authorize the secret controller per cluster, or use a supported central design, and ensure the same logical Secret name is materialized locally. Keep production vault access separate from dev even if the Application property is identical.

Sealed Secrets ciphertext is tied to controller keys and, by default, the exact name and namespace. A blob sealed for one cluster generally cannot be copied to another unless key and scope design intentionally allows it. Back up sealing keys and prefer strict scope unless broader reuse is explicitly required.

## Detect accidental leaks

Add pre-commit and CI secret scanning, but treat it as a last defense. Review Git history, build logs, generated manifests, KubeVela status outputs, and support bundles. If a secret was committed, deleting the line in a later commit is not remediation: revoke/rotate the credential, investigate access, and then clean history under your incident procedure.

## Official Documentation

- [KubeVela built-in component secret references](https://kubevela.io/docs/end-user/components/references/)
- [KubeVela binding configuration and Secrets](https://kubevela.io/docs/end-user/traits/service-binding/)
- [External Secrets `ExternalSecret` API](https://external-secrets.io/latest/api/externalsecret/)
- [External Secrets `SecretStore` API](https://external-secrets.io/latest/api/secretstore/)
- [Kubernetes Secrets good practices](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [Sealed Secrets official repository and usage](https://github.com/bitnami-labs/sealed-secrets)

## Conclusion

Keep secret values in a dedicated vault or encrypted secret system, materialize a namespaced Kubernetes Secret through one controller, and let the KubeVela Application reference only its name and key. Layer GitOps installation, test rotation and multi-cluster behavior, harden RBAC and encryption at rest, and rotate immediately if plaintext ever reaches Git or logs.
