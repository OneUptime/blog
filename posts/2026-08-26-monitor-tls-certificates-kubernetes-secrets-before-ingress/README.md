# How to Monitor TLS Certificates Inside Kubernetes Secrets Before They Reach an Ingress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Secrets, Ingress, Certificate Monitoring, Prometheus, cert-manager

Description: Validate certificate dates, SANs, key pairs, and Ingress references directly from Kubernetes TLS Secrets, then gate rollout and alert on stored state.

---

An external HTTPS probe sees a certificate only after an Ingress controller has loaded and served it. By then, a malformed renewal may already be user-facing. Inspecting the `kubernetes.io/tls` Secret adds an earlier control point for expiry, SAN loss, key mismatch, and malformed PEM data.

Kubernetes requires the keys `tls.crt` and `tls.key` for this Secret type, but the API server does not validate that their values are a usable certificate and private key. A successful `kubectl apply` is therefore not certificate validation.

## Inspect One Secret Safely

First verify the type and required fields without printing their contents:

```bash
kubectl -n edge get secret api-tls -o json |
jq -e '
  .type == "kubernetes.io/tls" and
  (.data["tls.crt"] | type == "string") and
  (.data["tls.key"] | type == "string")
'
```

Decode into a private temporary directory. Do not put decoded private keys in CI artifacts, command output, or a shared workspace:

```bash
work_dir=$(mktemp -d)
chmod 700 "$work_dir"
trap 'rm -rf -- "$work_dir"' EXIT

kubectl -n edge get secret api-tls -o json |
jq -r '.data["tls.crt"]' |
openssl base64 -d -A >"$work_dir/tls.crt"

kubectl -n edge get secret api-tls -o json |
jq -r '.data["tls.key"]' |
openssl base64 -d -A >"$work_dir/tls.key"
chmod 600 "$work_dir/tls.key"
```

Reading a Secret requires sensitive API permission. Use a namespace-scoped service account where possible. Kubernetes warns that `list` and `watch` on Secrets reveal their contents; the built-in `view` role deliberately excludes them.

## Validate the Leaf and Its Deadline

`tls.crt` can contain a leaf followed by intermediates. `openssl x509` reads the first certificate, which should be the leaf used by the Ingress:

```bash
openssl x509 -in "$work_dir/tls.crt" -noout \
  -subject -issuer -serial -dates -fingerprint -sha256 \
  -ext subjectAltName
```

Fail if that leaf expires inside 30 days:

```bash
if ! openssl x509 -in "$work_dir/tls.crt" -noout -checkend 2592000; then
  echo "api-tls expires within 30 days" >&2
  exit 1
fi
```

`-checkend` exits nonzero when the certificate will expire within the supplied number of seconds. Use a threshold longer than the complete renewal, approval, rollout, and rollback path.

## Verify the Private Key Matches

Compare hashes of the public key derived from each object. This works for RSA and elliptic-curve keys, unlike comparing RSA moduli:

```bash
set -o pipefail

cert_public_key=$(
  openssl x509 -in "$work_dir/tls.crt" -pubkey -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256
)

private_key_public_key=$(
  openssl pkey -in "$work_dir/tls.key" -pubout -outform DER |
  openssl dgst -sha256
)

if [ "$cert_public_key" != "$private_key_public_key" ]; then
  echo "tls.crt and tls.key do not form a key pair" >&2
  exit 1
fi
```

Never emit either key or its raw public-key DER as a Prometheus label. A bounded success gauge is enough; keep fingerprints in an access-controlled inventory or event log.

## Check Every Host That References the Secret

Ingress `spec.tls[].hosts` must correspond to names in the referenced certificate. Extract the actual relationships instead of assuming that one Secret serves one host:

```bash
kubectl -n edge get ingress -o json |
jq -r '
  .items[] |
  .metadata.name as $ingress |
  .spec.tls[]? |
  select(.secretName == "api-tls") |
  .hosts[]? |
  [$ingress, .] | @tsv
' |
while IFS=$'\t' read -r ingress_name hostname; do
  if ! openssl x509 -in "$work_dir/tls.crt" -noout -checkhost "$hostname"; then
    echo "$ingress_name expects $hostname, but api-tls does not cover it" >&2
    exit 1
  fi
done
```

`-checkhost` applies certificate hostname matching, including valid wildcard behavior. It is better than searching the printed SAN text because `*.example.com` can cover `api.example.com` but cannot cover the apex or a multi-label descendant.

Also inventory Gateway API `certificateRefs`, controller-specific custom resources, and Secrets copied between namespaces or clusters. An Ingress-only query is not a complete deployment inventory.

## Make Validation a Gate, Not Just a Scan

A periodic scanner cannot guarantee “before Ingress” if a controller immediately watches and reloads the same Secret. Use one of these controlled workflows:

- validate the certificate and key in CI before creating the Secret;
- write a renewal to a staging Secret such as `api-tls-next`, validate it, then update the Ingress reference;
- use an admission policy or webhook that rejects invalid TLS Secret writes; or
- have the certificate controller publish only after an explicit validation phase.

After switching the reference, probe the live endpoint with correct SNI before deleting the old Secret. Stored-state validation proves what is in Kubernetes; it does not prove that every Ingress replica has reloaded it.

## Export Stored-State Metrics Deliberately

For cert-manager-managed `Certificate` resources, current cert-manager exposes metrics including:

```promql
certmanager_certificate_not_after_timestamp_seconds
certmanager_certificate_ready_status
certmanager_certificate_renewal_timestamp_seconds
```

An expiry alert can filter out an unset zero timestamp:

```promql
certmanager_certificate_not_after_timestamp_seconds > 0
and
certmanager_certificate_not_after_timestamp_seconds - time() < 30 * 24 * 60 * 60
```

These metrics are built from `Certificate.status`, not by decoding arbitrary Secret bytes. They do not cover manually managed Secrets and cannot detect a Secret changed behind cert-manager's status. Confirm the metrics in your deployed cert-manager release.

For raw Secret coverage, implement a small pull-based scanner around the checks above. A sensible custom contract is one not-after timestamp and one validation result per cluster, namespace, and Secret, for example `tls_secret_leaf_not_after_timestamp_seconds` and `tls_secret_validation_success`. These are application-defined metrics, not kube-state-metrics metrics.

kube-state-metrics exposes Secret metadata such as `kube_secret_type`, creation time, and labels, but intentionally does not decode `tls.crt` into an expiry metric. Do not mistake `kube_secret_created` for certificate age.

Alert separately on scanner freshness. A green last result that has not been updated since the scanner lost API permission is not evidence of a healthy certificate.

## Official Documentation

- [Kubernetes TLS Secret type and validation limitations](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- [Kubernetes Ingress TLS fields](https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/#IngressSpec)
- [Kubernetes RBAC guidance for Secret access](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [kube-state-metrics Secret metrics](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/secret-metrics.md)
- [cert-manager Prometheus metrics](https://cert-manager.io/docs/devops-tips/prometheus-metrics/)
- [cert-manager certificate metric implementation](https://github.com/cert-manager/cert-manager/blob/master/internal/collectors/certificate_collector.go)
- [OpenSSL `x509` checks](https://docs.openssl.org/master/man1/openssl-x509/)

## Conclusion

Validate the stored leaf, deadline, SAN coverage, and key pair before an Ingress reference changes. Scope Secret-reading permission tightly, distinguish cert-manager status from raw Secret contents, and retain an external SNI probe after rollout. The stored-state and served-state checks catch different failure windows and are strongest together.
