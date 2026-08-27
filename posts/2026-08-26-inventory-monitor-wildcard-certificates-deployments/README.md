# How to Inventory and Monitor Wildcard Certificates Across Every Deployment Location

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wildcard Certificate, Certificate Inventory, TLS, Kubernetes, OpenSSL, Blackbox Exporter

Description: Build an owner-reviewed map from wildcard issuance to stored copies and live TLS termination points, then reconcile fingerprints, coverage, expiry, and rollout state.

---

A wildcard certificate such as `*.example.com` says which service identities its key may authenticate. It does not say where copies of that key and certificate are deployed. Certificate Transparency can reveal public issuance, but it cannot enumerate every CDN edge, load balancer, Kubernetes Secret, appliance, origin, or disaster-recovery site holding the private key.

To monitor every deployment location, maintain an inventory that joins three separate facts: certificates issued, certificate material stored, and certificates actually served.

## Start with the Wildcard's Real Scope

RFC 9525 permits a wildcard only as the complete left-most label, and it matches one label. Therefore:

```text
*.example.com covers api.example.com
*.example.com does not cover example.com
*.example.com does not cover v2.api.example.com
```

Do not send `*.example.com` as SNI. SNI identifies a concrete requested host, so each live probe needs a real covered name such as `api.example.com`.

Wildcard keys have a broad blast radius. Record the owner, issuer, key-storage boundary, renewal mechanism, approved DNS zone, and every system allowed to receive a copy. If unrelated teams need the same wildcard key, consider narrower certificates instead of normalizing uncontrolled replication.

## Define an Authoritative Inventory

For each certificate family, store fields such as:

```yaml
certificateSet: example-com-wildcard
requiredDnsSans:
  - "*.example.com"
  - "example.com"
owner: edge-platform
issuerProfile: public-production
renewalSource: central-certificate-pipeline
acceptedFingerprintsSha256:
  - "OLD_FINGERPRINT_DURING_ROLLOUT"
  - "NEW_FINGERPRINT_DURING_ROLLOUT"
deployments:
  - id: public-cdn
    probeHostname: www.example.com
  - id: eu-load-balancer
    connectAddress: 203.0.113.40:443
    sni: api.example.com
  - id: production-ingress-secret
    cluster: production-eu
    namespace: edge
    secret: example-com-tls
```

The accepted fingerprint list should normally contain one value. During a controlled rotation it can contain old and new values until a dated convergence deadline. Never use an unbounded “any valid wildcard” rule; it cannot detect a forgotten old copy.

## Discover Kubernetes Copies and References

List TLS Secrets without printing private keys:

```bash
set -o pipefail

kubectl get secrets --all-namespaces -o json |
jq -r '
  .items[] |
  select(.type == "kubernetes.io/tls") |
  [
    .metadata.namespace,
    .metadata.name,
    .metadata.uid,
    .data["tls.crt"]
  ] | @tsv
' |
while IFS=$'\t' read -r namespace secret uid encoded_certificate; do
  certificate=$(
    printf '%s' "$encoded_certificate" |
    openssl base64 -d -A
  )

  if ! printf '%s\n' "$certificate" | openssl x509 -noout >/dev/null 2>&1; then
    printf '%s\t%s\t%s\tINVALID_CERTIFICATE\n' \
      "$namespace" "$secret" "$uid" >&2
    continue
  fi

  subject=$(printf '%s\n' "$certificate" | openssl x509 -noout -subject)
  fingerprint=$(printf '%s\n' "$certificate" | openssl x509 -noout -fingerprint -sha256)
  expiry=$(printf '%s\n' "$certificate" | openssl x509 -noout -enddate)
  sans=$(printf '%s\n' "$certificate" | openssl x509 -noout -ext subjectAltName | tr '\n' ' ')

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$namespace" "$secret" "$uid" "$subject" "$fingerprint" "$expiry $sans"
done
```

The first PEM certificate in `tls.crt` should be the leaf. Kubernetes checks that a TLS Secret contains `tls.crt` and `tls.key`, but it does not validate their values, so the loop explicitly reports an invalid certificate. This process never selects, decodes, or prints `tls.key`; however, the Secret list response still transfers all returned Secret data, including private keys, to `kubectl` and `jq`. The shown `--all-namespaces` query requires cluster-wide `list` access. For a namespace-scoped inventory service account, run the query once per approved namespace with `--namespace <name>`, and protect its output.

Native Kubernetes RBAC does not filter Secret `list` access by label. Enforcing a label-scoped list requires clients to send the selector and an authorization layer beyond a Role, such as a selector-aware authorization webhook or a separate trusted API or inventory controller. The type filter above finds conventionally typed TLS Secrets; enumerate `Opaque` and controller-specific Secret layouts separately because they can also hold TLS material.

Map Ingress references to those Secrets:

```bash
set -o pipefail

kubectl get ingress --all-namespaces -o json |
jq -r '
  .items[] |
  .metadata.namespace as $namespace |
  .metadata.name as $ingress |
  .spec.tls[]? |
  select((.secretName // "") != "") |
  .secretName as $secret |
  (.hosts // []) as $hosts |
  if ($hosts | length) == 0 then
    [$namespace, $ingress, $secret, ""]
  else
    $hosts[] | [$namespace, $ingress, $secret, .]
  end | @tsv
'
```

Add Gateway API `certificateRefs`, service-mesh gateways, controller-specific routes, copied Secrets, and external secret stores. A Secret that is not referenced can still be a risky forgotten private-key copy; a reference with no matching inventory entry is a coverage gap.

## Query Every Other Control Plane

Enumerate certificate stores through their authoritative APIs rather than only scanning disks:

- CDN and WAF certificate bindings;
- cloud load-balancer listeners and managed certificate services;
- ingress and service-mesh gateways in every cluster;
- reverse proxies, mail gateways, VPNs, and appliances;
- secret managers, HSM-backed key services, and configuration repositories; and
- dormant disaster-recovery and rollback environments.

Normalize issuer, serial, SAN set, `notBefore`, `notAfter`, SHA-256 certificate fingerprint, public-key identifier, and binding location. A managed service may not expose the private key, but it should expose enough certificate metadata and listener bindings to reconcile.

Certificate Transparency is a valuable fourth feed for unexpected public issuance activity or intent to issue. RFC 9162 defines each CT log as an append-only Merkle tree of submitted certificate and precertificate entries. It does not prove current deployment and usually does not cover private-CA certificates, so never use CT as the deployment inventory.

## Probe Pinned Deployment Locations

For a normal public hostname, Blackbox Exporter HTTP modules with certificate validation enabled and redirects disabled provide reachability, hostname and chain validation, and expiry signals for that endpoint. To test a particular backend or regional address, pin the TCP destination while sending a concrete SNI name:

```bash
server_output=$(
  openssl s_client \
    -connect 203.0.113.40:443 \
    -servername api.example.com \
    -verify_hostname api.example.com \
    -verify_return_error \
    -showcerts </dev/null
) &&

printf '%s\n' "$server_output" |
openssl x509 -noout \
  -checkhost api.example.com \
  -subject -issuer -serial -dates -fingerprint -sha256 -ext subjectAltName
```

Compare the returned fingerprint with the inventory's accepted set. For an endpoint whose trust anchor is not in the default trust store, add the appropriate CA trust bundle with `-CAfile`. Repeat for IPv4, IPv6, every load-balancer address, region, origin, and failover site, and probe anycast services from representative network vantage points.

One DNS probe per hostname is not enough when round-robin DNS or anycast can hide a lagging node. Conversely, scanning only IPs without SNI can inventory default certificates rather than the wildcard virtual host.

## Reconcile Stored, Bound, and Served State

Run these independent comparisons:

| Comparison | Detects |
| --- | --- |
| Issuance vs approved certificate sets | Unauthorized or forgotten issuance |
| Stored copies vs approved deployment list | Key sprawl and orphaned Secrets |
| Listener bindings vs stored objects | Wrong or unused certificate attachment |
| Live probes vs accepted fingerprints | Stale nodes and partial rollout |
| Required hostnames vs SAN coverage | Wildcard scope mistakes and missing apex SAN |
| `notAfter` vs renewal lead time | Upcoming expiry |

Alert when an expected location disappears from the scan, not only when a returned certificate is unhealthy. Every scanner needs a last-success timestamp, and inventory removals should require owner approval so deleting a target cannot silence its alert.

During renewal, publish the new accepted fingerprint, deploy it, verify every live and stored location, remove the old fingerprint from the accepted set, and then revoke obsolete certificates and destroy obsolete private-key material according to policy. Keep the overlap bounded; otherwise “rotation in progress” becomes permanent ambiguity.

Avoid placing raw fingerprints or whole SAN lists on high-cardinality metric labels. Current Blackbox Exporter releases emit `probe_ssl_last_chain_info` with fingerprint and SAN-derived labels, so drop that metric during ingestion if those details should remain only in controlled evidence storage. Use stable deployment IDs for Prometheus series and keep detailed evidence in an inventory database or controlled scan report.

## Official Documentation

- [RFC 9525 wildcard certificate matching](https://www.rfc-editor.org/rfc/rfc9525.html#section-6.3)
- [RFC 9162 Certificate Transparency](https://www.rfc-editor.org/rfc/rfc9162.html)
- [Kubernetes TLS Secrets](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- [Kubernetes Ingress TLS references](https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/)
- [Kubernetes RBAC risks of listing Secrets](https://kubernetes.io/docs/concepts/security/rbac-good-practices/#listing-secrets)
- [OpenSSL certificate inspection and hostname checks](https://docs.openssl.org/master/man1/openssl-x509/)
- [Blackbox Exporter multi-target monitoring](https://prometheus.io/docs/guides/multi-target-exporter/)

## Conclusion

A wildcard SAN is an authority boundary, not a deployment map. Join issuance records, stored copies, listener bindings, and strict live probes under stable owner-reviewed deployment IDs. Reconcile every cluster, region, address family, origin, and failover site, and require full fingerprint convergence after rotation so a forgotten wildcard copy cannot age silently toward failure—or remain an unnecessary key-sprawl risk.
