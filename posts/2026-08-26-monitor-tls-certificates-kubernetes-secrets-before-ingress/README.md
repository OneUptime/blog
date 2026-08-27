# Monitor TLS Certificates in Kubernetes Secrets Before Ingress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Secret, Ingress, Certificate Monitoring, Prometheus, Cert-Manager

Description: Validate certificate expiry, SANs, key pairs, and Ingress references directly from Kubernetes TLS Secrets, then gate rollout and alert on stored state.

---

An external HTTPS probe sees a certificate only after an Ingress controller has loaded and served it. By then, a malformed renewal may already be user-facing. Inspecting the `kubernetes.io/tls` Secret adds an earlier control point for expiry, SAN loss, key mismatch, and malformed leaf or key PEM data.

Kubernetes requires the keys `tls.crt` and `tls.key` for this Secret type, but the API server does not validate that their values are a usable certificate and private key. A successful `kubectl apply` is therefore not certificate validation.

## Inspect One Secret Safely

First capture one API snapshot in a private temporary directory, then verify the type and required fields without printing their contents. Fetching once avoids mixing a certificate and key from different Secret versions during a renewal:

```bash
set -o pipefail

work_dir=$(mktemp -d)
chmod 700 "$work_dir"
trap 'rm -rf -- "$work_dir"' EXIT

if ! kubectl -n edge get secret api-tls -o json >"$work_dir/secret.json"; then
  echo "could not read edge/api-tls" >&2
  exit 1
fi
chmod 600 "$work_dir/secret.json"

if ! jq -e '
  .type == "kubernetes.io/tls" and
  (.data["tls.crt"] | type == "string") and
  (.data["tls.key"] | type == "string")
' "$work_dir/secret.json" >/dev/null; then
  echo "edge/api-tls does not have the expected TLS Secret type and fields" >&2
  exit 1
fi
```

Decode from that snapshot. Do not put decoded private keys in CI artifacts, command output, or a shared workspace:

```bash
if ! jq -r '.data["tls.crt"]' "$work_dir/secret.json" |
  openssl base64 -d -A >"$work_dir/tls.crt"; then
  echo "could not decode tls.crt" >&2
  exit 1
fi

if ! jq -r '.data["tls.key"]' "$work_dir/secret.json" |
  openssl base64 -d -A >"$work_dir/tls.key"; then
  echo "could not decode tls.key" >&2
  exit 1
fi
chmod 600 "$work_dir/tls.key"
```

Reading a Secret requires sensitive API permission. Use a dedicated ServiceAccount and grant it Secret access through a Role and RoleBinding limited to the target namespace where possible. Kubernetes warns that `list` and `watch` on Secrets reveal their contents; the built-in `view` role deliberately excludes them.

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

`-checkend` exits nonzero when the certificate will expire within the supplied number of seconds. It does not reject a certificate whose `notBefore` is in the future; enforce that separately if future-dated certificates are unacceptable in the rollout window. Use a threshold longer than the complete renewal, approval, rollout, and rollback path.

## Verify the Private Key Matches

Compare hashes of the public key derived from each object. This works for RSA and elliptic-curve keys, unlike comparing RSA moduli:

```bash
set -o pipefail

if ! openssl pkey -in "$work_dir/tls.key" -passin pass: -check -noout >/dev/null; then
  echo "tls.key is inconsistent or cannot be read non-interactively" >&2
  exit 1
fi

if ! cert_public_key=$(
  openssl x509 -in "$work_dir/tls.crt" -pubkey -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256
); then
  echo "could not derive the certificate public key" >&2
  exit 1
fi

if ! private_key_public_key=$(
  openssl pkey -in "$work_dir/tls.key" -passin pass: -pubout -outform DER |
  openssl dgst -sha256
); then
  echo "could not derive the private key's public key" >&2
  exit 1
fi

if [ "$cert_public_key" != "$private_key_public_key" ]; then
  echo "tls.crt and tls.key do not form a key pair" >&2
  exit 1
fi
```

Never emit either key or its raw public-key DER as a Prometheus label. A bounded success gauge is enough; keep fingerprints in an access-controlled inventory or event log.

## Check Every Host That References the Secret

Ingress `spec.tls[].hosts` must correspond to names in the referenced certificate. Extract the actual relationships instead of assuming that one Secret serves one host:

```bash
set -o pipefail

if ! subject_alt_names=$(
  openssl x509 -in "$work_dir/tls.crt" -noout -ext subjectAltName
); then
  echo "could not read subjectAltName" >&2
  exit 1
fi

if [[ ! "$subject_alt_names" =~ (^|[[:space:],])DNS: ]]; then
  echo "api-tls has no DNS subjectAltName entries" >&2
  exit 1
fi

if ! kubectl -n edge get ingress -o json |
  jq -r '
  .items[] |
  .metadata.name as $ingress |
  .spec.tls[]? |
  select(.secretName == "api-tls") |
  if ((.hosts // []) | length) == 0 then
    error("\($ingress) references api-tls without explicit spec.tls.hosts")
  else
    .hosts[] |
    [$ingress, .] | @tsv
  end
' >"$work_dir/ingress-hosts.tsv"; then
  echo "could not build a complete host inventory for api-tls" >&2
  exit 1
fi

while IFS=$'\t' read -r ingress_name hostname; do
  if ! openssl x509 -in "$work_dir/tls.crt" -noout -checkhost "$hostname"; then
    echo "$ingress_name expects $hostname, but api-tls does not cover it" >&2
    exit 1
  fi
done <"$work_dir/ingress-hosts.tsv"
```

The DNS SAN guard prevents `-checkhost` from falling back to the subject Common Name. `-checkhost` handles the common whole-label wildcard case: `*.example.com` can cover `api.example.com` but cannot cover the apex or a multi-label descendant. OpenSSL's default matcher can also accept partial-label wildcards such as `w*.example.com`; if a private issuer can produce those, reject them separately or use the same verifier as your clients to enforce RFC 9525. The jq filter deliberately rejects a matching TLS entry with no explicit `hosts`, because that optional field has controller-dependent behavior.

Also inventory Gateway API `certificateRefs`, controller-specific custom resources, and Secrets copied between namespaces or clusters. An Ingress-only query is not a complete deployment inventory.

## Make Validation a Gate, Not Just a Scan

A periodic scanner cannot guarantee “before Ingress” if a controller immediately watches and reloads the same Secret. Use one of these controlled workflows:

- validate the certificate and key in CI before creating the Secret;
- write a renewal to a staging Secret such as `api-tls-next`, validate it, then update the Ingress reference;
- use a validating admission webhook-or a policy engine with X.509 parsing support-that rejects invalid TLS Secret writes; or
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

kube-state-metrics exposes Secret metadata such as `kube_secret_type`, creation time, and allowlisted labels, but intentionally does not decode `tls.crt` into an expiry metric. Do not mistake `kube_secret_created` for certificate age.

Alert separately on scanner freshness. A green last result that has not been updated since the scanner lost API permission is not evidence of a healthy certificate.

## Official Documentation

- [Kubernetes TLS Secret type and validation limitations](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- [Kubernetes Ingress TLS fields](https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/#ingresstls)
- [Kubernetes RBAC guidance for Secret access](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [kube-state-metrics Secret metrics](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/secret-metrics.md)
- [cert-manager Prometheus metrics](https://cert-manager.io/docs/devops-tips/prometheus-metrics/)
- [cert-manager certificate metric implementation](https://github.com/cert-manager/cert-manager/blob/master/internal/collectors/certificate_collector.go)
- [OpenSSL `x509` checks](https://docs.openssl.org/master/man1/openssl-x509/)
- [OpenSSL hostname matching behavior](https://docs.openssl.org/master/man3/X509_check_host/)
- [RFC 9525 service identity matching](https://www.rfc-editor.org/rfc/rfc9525.html)

## Conclusion

Validate the stored leaf, deadline, SAN coverage, and key pair before an Ingress reference changes. Scope Secret-reading permission tightly, distinguish cert-manager status from raw Secret contents, and retain an external SNI probe after rollout. The stored-state and served-state checks catch different failure windows and are strongest together.
