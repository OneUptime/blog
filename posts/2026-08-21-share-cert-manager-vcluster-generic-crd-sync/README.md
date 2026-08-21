# How to Share Cert-Manager with vCluster Using Generic CRD Sync

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Cert-Manager, Kubernetes, Custom Resources, TLS

Description: Reuse a host cert-manager installation by synchronizing namespaced certificate resources and translating their Secret and Issuer references.

---

Installing cert-manager in every vCluster duplicates controllers and webhooks and gives each tenant another component to upgrade. Generic custom-resource synchronization can instead copy selected cert-manager CRDs into the tenant API, export tenant `Issuer` and `Certificate` objects to the control plane cluster, and return the generated Secret.

This guide targets vCluster **0.36** and cert-manager's stable `cert-manager.io/v1` APIs on shared nodes. vCluster 0.36 also has a purpose-built `integrations.certManager` option, which is the recommended default for ordinary cert-manager sharing **when your vCluster plan includes it**; the current v0.36 documentation marks that integration Enterprise-only. Use the generic approach when you need explicit CRD-level policy or are building the same pattern for another operator, and check the current feature matrix for custom-resource sync availability in your edition. Generic to-host custom-resource sync supports namespaced resources only, so it cannot export tenant-created `ClusterIssuer` objects.

## How the Reconciliation Path Works

```text
tenant Certificate + Issuer
          |
          | vCluster custom-resource sync and reference translation
          v
host Certificate + Issuer -> host cert-manager -> host Secret
          ^                                      |
          +---------- status / child sync -------+
```

The cert-manager controller and webhook run only in the control plane cluster. The corresponding CRDs must already be installed there before vCluster starts. vCluster copies the selected CRD definitions into the tenant API.

When a synchronized custom resource causes the host operator to create another resource, vCluster attempts to detect that child and synchronize it back. A generated certificate Secret is the important case here. Test that behavior against your pinned vCluster and cert-manager versions before making it a platform contract.

## Verify the Host Installation

With the control plane cluster context:

```bash
kubectl get deployment -n cert-manager
kubectl get crd \
  issuers.cert-manager.io \
  certificates.cert-manager.io \
  certificaterequests.cert-manager.io
kubectl api-resources --api-group=cert-manager.io
```

Confirm the CRD storage version is `v1`:

```bash
kubectl get crd certificates.cert-manager.io \
  -o jsonpath='{range .spec.versions[?(@.storage==true)]}{.name}{"\n"}{end}'
```

vCluster permits one configured version per custom resource. Do not configure both a versioned and unversioned key for the same CRD.

## Configure Generic Sync with Reference Patches

Create `vcluster.yaml`:

```yaml
sync:
  toHost:
    customResources:
      issuers.cert-manager.io/v1:
        enabled: true
      certificates.cert-manager.io/v1:
        enabled: true
        patches:
          - path: spec.secretName
            reference:
              apiVersion: v1
              kind: Secret
          - path: spec.issuerRef.name
            reference:
              apiVersion: cert-manager.io/v1
              kind: Issuer
```

The `spec.secretName` patch tells vCluster that the value names a Secret, so the host `Certificate` refers to the translated host Secret and the result can be mapped back. The `spec.issuerRef.name` patch does the same for a namespaced `Issuer`.

This deliberately supports only `Issuer`, not `ClusterIssuer`. If tenants need approved host `ClusterIssuer` objects, use the built-in cert-manager integration with a label selector instead of pretending a fixed `Issuer` reference can safely represent both scopes.

Apply the configuration:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

## Create a Tenant Issuer and Certificate

For a smoke test, use a namespaced self-signed issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: tenant-selfsigned
  namespace: apps
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: web
  namespace: apps
spec:
  secretName: web-tls
  subject:
    organizations:
      - Example
  dnsNames:
    - web.apps.svc.cluster.local
  issuerRef:
    name: tenant-selfsigned
    kind: Issuer
    group: cert-manager.io
```

```bash
kubectl create namespace apps
kubectl apply -f certificate.yaml
kubectl wait certificate/web -n apps \
  --for=condition=Ready \
  --timeout=2m
kubectl get certificate,issuer,secret -n apps
```

To adapt this generic pattern to a CA, ACME, Vault, or another production issuer, add a reference patch for every `Issuer` field that names a namespaced resource, such as a Secret, and enable synchronization for each referenced kind. Then follow that issuer's official cert-manager documentation. A self-signed certificate proves resource translation, not production trust.

## Verify Both Sides

In the tenant cluster:

```bash
kubectl describe certificate web -n apps
kubectl get secret web-tls -n apps \
  -o jsonpath='{.type}{"\n"}'
```

In the control plane cluster, use vCluster management labels to locate the tenant-origin objects rather than hard-coding translated names:

```bash
kubectl get issuer,certificate,certificaterequest -A \
  -l vcluster.loft.sh/managed-by
kubectl get certificate -A \
  -l vcluster.loft.sh/managed-by \
  -o custom-columns='NAMESPACE:.metadata.namespace,CERTIFICATE:.metadata.name,SECRET:.spec.secretName,ISSUER:.spec.issuerRef.name'
```

The generated TLS Secret is not guaranteed to carry the vCluster management label. Use the `NAMESPACE` and `SECRET` values from the second command to retrieve it directly. The host `Certificate.spec.secretName` and `issuerRef.name` should point at translated objects. Manual edits to host copies are reconciled away or reflected according to the sync rules; make changes through the tenant object or vCluster configuration.

If the Certificate appears on the host but no tenant Secret arrives, inspect the host Certificate events and cert-manager logs first. Then inspect vCluster logs for child-resource discovery. Do not paper over the failure by syncing all host Secrets; that creates a much larger confidentiality boundary.

## Prefer the Built-In Integration for the Common Case When Licensed

The Enterprise-only vCluster 0.36 integration for normal cert-manager sharing is much smaller:

```yaml
integrations:
  certManager:
    enabled: true
    sync:
      fromHost:
        clusterIssuers:
          enabled: true
          selector:
            labels:
              platform.example.com/tenant-visible: "true"
```

It exports tenant Certificates and Issuers, imports selected ClusterIssuers, and handles generated Secrets. Prefer it unless generic sync's explicit resource-level behavior is a requirement.

## Official Documentation

- [vCluster: Sync custom resources to the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/custom-resources)
- [vCluster: Patching synchronized resources](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/patching)
- [vCluster: cert-manager integration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/integrations/cert-manager)
- [cert-manager: Certificate resource](https://cert-manager.io/docs/usage/certificate/)
- [cert-manager: Issuer configuration](https://cert-manager.io/docs/configuration/)

## Conclusion

Generic CRD sync can share a single host operator without copying it into every tenant, but the reference graph is part of the configuration. Pin one CRD version, translate the Secret and Issuer names, test generated-Secret return, and keep the scope namespaced. For standard cert-manager sharing, the built-in vCluster integration is simpler and safer.
