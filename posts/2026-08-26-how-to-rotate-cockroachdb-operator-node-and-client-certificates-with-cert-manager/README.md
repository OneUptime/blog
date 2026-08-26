# How to Rotate CockroachDB Operator Node and Client Certificates with cert-manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, cert-manager, TLS, Certificate Rotation, PKI

Description: Configure and exercise cert-manager leaf-certificate rotation for a GA v1beta1 CockroachDB Operator cluster, including CA distribution, renewal windows, live verification, and CA-rotation boundaries.

---

In the GA CockroachDB Operator, cert-manager owns issuance and renewal while the CockroachDB chart supplies the two `Certificate` specifications and tells `CrdbNode` pods which Secrets and CA ConfigMap to mount. A successful cert-manager renewal is therefore only the first checkpoint. Rotation is complete when the live CockroachDB endpoints present and trust the new material.

This guide targets the GA `crdb.cockroachlabs.com/v1beta1` Operator installed from `cockroachdb-parent`. It does not use the deprecated Public Operator's `v1alpha1` fields `nodeTLSSecret` and `clientTLSSecret`, nor the older StatefulSet chart's `tls.certs.certManager` values.

## Build the Trust Path First

The GA chart expects the CA certificate in a ConfigMap because CockroachDB needs a readable trust bundle, while a cert-manager CA Issuer normally reads its signer certificate and private key from a Secret. Cockroach Labs' chart guide uses trust-manager to copy the public CA certificate into a ConfigMap.

For an existing organizational CA, create the CA Secret through your approved secret-delivery system. Its public certificate and signer key must appear as `tls.crt` and `tls.key`. Then create a namespaced Issuer using the current cert-manager API:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: cockroachdb
  namespace: database
spec:
  ca:
    secretName: cockroachdb-ca
```

Create a trust-manager `Bundle` that publishes the CA certificate as `ca.crt` in ConfigMap `cockroachdb-ca`. Apply the namespace-selection and trust-namespace rules from the trust-manager version you installed; do not grant it broad Secret access merely to make the example work.

Before installing CockroachDB, verify both sides exist:

```bash
kubectl get issuer cockroachdb -n database
kubectl get secret cockroachdb-ca -n database
kubectl get configmap cockroachdb-ca -n database \
  -o go-template='{{index .data "ca.crt"}}' | openssl x509 -noout -subject -issuer -dates
```

## Enable Exactly One Certificate Mode

Use the GA parent chart's nested values. The following example requests one-year node certificates renewed seven days before expiration and 28-day root-client certificates renewed two days before expiration:

```yaml
cockroachdb:
  tls:
    enabled: true
    selfSigner:
      enabled: false
    certManager:
      enabled: true
      caConfigMap: cockroachdb-ca
      nodeSecret: cockroachdb-node
      clientRootSecret: cockroachdb-root
      issuer:
        group: cert-manager.io
        kind: Issuer
        name: cockroachdb
        clientCertDuration: 672h
        clientCertExpiryWindow: 48h
        nodeCertDuration: 8760h
        nodeCertExpiryWindow: 168h
    externalCertificates:
      enabled: false
```

The chart requires exactly one of `selfSigner`, `certManager`, or `externalCertificates` when TLS is enabled. It also warns against toggling TLS on an already-running insecure cluster. Treat secure-versus-insecure deployment mode as an initialization decision, not a routine Helm switch.

The chart renders two cert-manager resources:

- `<release-fullname>-node`, with Common Name `node`, server and client usages, and DNS SANs for localhost, public Service names, pod wildcards, and the GA `-join` Service;
- `<release-fullname>-root-client`, with Common Name `root` and client-auth usage.

Their output Secrets are the configured `cockroachdb-node` and `cockroachdb-root`. The chart then maps those into `spec.template.spec.certificates.externalCertificates` on the `v1beta1` `CrdbCluster`, together with the CA ConfigMap. Do not hand-edit the rendered `Certificate` objects to add routine SANs; put supported configuration in Helm values so the next upgrade does not revert it.

Install or upgrade with the pinned parent chart:

```bash
helm upgrade --install crdb ./cockroachdb-parent \
  --namespace database \
  --create-namespace \
  --values values.yaml
```

## Prove Initial Issuance Before Testing Rotation

Find the exact rendered Certificate names rather than assuming the release fullname:

```bash
kubectl get certificate -n database
kubectl wait --for=condition=Ready certificate --all \
  -n database --timeout=5m

kubectl get certificate -n database \
  -o custom-columns=NAME:.metadata.name,SECRET:.spec.secretName,READY:.status.conditions[0].status,RENEWAL:.status.renewalTime
```

Inspect the issued leaves without exposing private keys:

```bash
kubectl get secret cockroachdb-node -n database \
  -o jsonpath='{.data.tls\.crt}' | base64 -d \
  | openssl x509 -noout -serial -fingerprint -sha256 -subject -issuer -dates -ext subjectAltName

kubectl get secret cockroachdb-root -n database \
  -o jsonpath='{.data.tls\.crt}' | base64 -d \
  | openssl x509 -noout -serial -fingerprint -sha256 -subject -issuer -dates
```

Verify each leaf against the CA ConfigMap. A `Certificate` with `Ready=True` proves that cert-manager issued the Secret, not that the CA bundle mounted by CockroachDB matches it.

```bash
workdir="$(mktemp -d)"
kubectl get configmap cockroachdb-ca -n database \
  -o go-template='{{index .data "ca.crt"}}' > "$workdir/ca.crt"
kubectl get secret cockroachdb-node -n database \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > "$workdir/node.crt"
openssl verify -CAfile "$workdir/ca.crt" "$workdir/node.crt"
```

## Trigger a Controlled Leaf Renewal

cert-manager renews automatically at the `renewBefore` time rendered from `nodeCertExpiryWindow` and `clientCertExpiryWindow`. To rehearse the process, record both current fingerprints and Secret resource versions, then use cert-manager's supported manual renewal command:

```bash
kubectl get secret cockroachdb-node cockroachdb-root -n database \
  -o custom-columns=NAME:.metadata.name,RESOURCE_VERSION:.metadata.resourceVersion

cmctl renew <release-fullname>-node -n database
cmctl renew <release-fullname>-root-client -n database

kubectl get certificate,certificaterequest -n database -w
```

Wait for a new `CertificateRequest` to become Ready, the corresponding `Certificate.status.revision` to increment, and both target Secret resource versions to change. A simple `kubectl wait` on `Certificate` Ready is insufficient for this rehearsal because the old revision may still satisfy that condition when the renewal begins.

Do not delete the target Secrets as a rotation mechanism. cert-manager documents `cmctl renew` as the supported manual trigger. Also keep `duration` comfortably greater than `renewBefore`; a renewal window too close to the effective lifetime can create a renewal loop, especially when an issuer returns a shorter certificate than requested.

Re-read the serials, fingerprints, `notAfter` dates, and Secret resource versions. Then watch the CockroachDB resources:

```bash
kubectl get crdbnode -n database -w
kubectl get pods -n database \
  -l crdb.cockroachlabs.com/cluster=<cluster-name> -w
```

The installed Operator/chart release controls how mounted certificate changes are reloaded. Do not call the operation complete from the Secret alone. Verify every live SQL and HTTPS endpoint presents the new certificate and accepts the intended client chain. CockroachDB supports reloading certificates with `SIGHUP`; if your installed release does not complete the reload automatically, use the chart's supported rolling-restart mechanism during a maintenance window rather than deleting all database pods together.

For a chart-managed cluster, changing `cockroachdb.crdbCluster.timestamp` on a Helm upgrade requests an operator-controlled rolling restart:

```bash
helm upgrade crdb ./cockroachdb-parent \
  --namespace database \
  --reuse-values \
  --set-string cockroachdb.crdbCluster.timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

Confirm pod readiness and zero unavailable or under-replicated ranges throughout. Finally, make a real application-style connection with the renewed root-client Secret. A certificate visible on disk but not in the live TLS handshake has not been rotated operationally.

## Treat CA Rotation as a Separate Ceremony

The steps above rotate leaf certificates under the same CA. Replacing the CA Secret is not equivalent. During CA rotation, old nodes, new nodes, old clients, and new clients overlap. CockroachDB's documented procedure distributes a combined old-plus-new CA bundle first, reloads trust everywhere, and only then rotates node and client leaves. Removing the old CA before every participant trusts the new one can partition the cluster or lock out clients.

cert-manager's CA Issuer does not by itself orchestrate that distributed trust transition. Plan CA rotation independently, update the trust-manager Bundle safely, and verify both roots are accepted before issuing new leaves. Retire the old root only after all live nodes and clients have moved.

## Official Documentation

- [CockroachDB parent chart cert-manager integration](https://github.com/cockroachdb/helm-charts/blob/master/docs/certificate-management/cert-manager.md)
- [GA node Certificate template](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/templates/certificate.node.yaml)
- [GA root-client Certificate template](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/templates/certificate.client.yaml)
- [cert-manager Certificate renewal behavior](https://cert-manager.io/docs/usage/certificate/)
- [cert-manager manual renewal with cmctl](https://cert-manager.io/docs/reference/cmctl/#renew)
- [trust-manager documentation](https://cert-manager.io/docs/trust/trust-manager/)
- [CockroachDB certificate rotation](https://www.cockroachlabs.com/docs/stable/rotate-certificates)

## Conclusion

Reliable rotation is a chain of evidence: cert-manager renews the two leaves, the configured Secrets and CA ConfigMap form a valid trust path, the Operator reloads or rolls nodes safely, and live handshakes expose the new identities. Rehearse leaf renewal before expiry and keep CA replacement as a deliberate, overlapping-trust operation.
