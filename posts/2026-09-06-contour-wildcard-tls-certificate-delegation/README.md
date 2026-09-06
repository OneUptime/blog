# Share Wildcard TLS Secrets with Contour Certificate Delegation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, TLS, Wildcard Certificate, Cert-Manager, Kubernetes, HTTPProxy

Description: Share one centrally managed wildcard TLS Secret with selected namespaces using Contour TLSCertificateDelegation.

---

Kubernetes normally keeps Secret references within a namespace. Contour's `TLSCertificateDelegation` resource adds a controlled exception for TLS material: the owner of a Secret can authorize HTTPProxies in named namespaces to reference it.

This is useful when a platform team owns `*.example.com` while application teams own individual HTTPProxy resources. Delegation does not copy the Secret and does not give application users Kubernetes API permission to read it. It authorizes Contour to use that Secret for selected cross-namespace references.

## Create the Certificate in Its Owner Namespace

Issue the wildcard in a namespace controlled by the certificate team. ACME wildcard certificates require DNS-01, not HTTP-01:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: edge-certificates
spec:
  secretName: wildcard-example-com-tls
  dnsNames:
  - '*.example.com'
  issuerRef:
    name: letsencrypt-dns
    kind: ClusterIssuer
    group: cert-manager.io
  privateKey:
    rotationPolicy: Always
```

The resulting Secret must be a valid `kubernetes.io/tls` Secret with `tls.crt` and `tls.key`. A wildcard for `*.example.com` matches one label such as `shop.example.com`; it does not match the apex `example.com` or a deeper name such as `api.shop.example.com`. Add the apex as a separate `dnsNames` entry if it must be served too.

Wait for issuance before delegating:

```bash
kubectl -n edge-certificates wait certificate/wildcard-example-com \
  --for=condition=Ready --timeout=5m
kubectl -n edge-certificates get secret wildcard-example-com-tls \
  -o jsonpath='{.type}{"\n"}'
```

## Delegate to Explicit Application Namespaces

Create the delegation in the same namespace as the Secret:

```yaml
apiVersion: projectcontour.io/v1
kind: TLSCertificateDelegation
metadata:
  name: wildcard-example-com
  namespace: edge-certificates
spec:
  delegations:
  - secretName: wildcard-example-com-tls
    targetNamespaces:
    - storefront
    - support
```

Use explicit namespace names where possible. `targetNamespaces: ['*']` delegates the Secret to every namespace watched by Contour and greatly expands the set of users who can make Envoy present that private-key identity.

The delegation grants use of exactly the named Secret. It does not grant access to every certificate in `edge-certificates`, and it does not constrain which matching hostname an authorized target namespace may claim. Admission policy and ownership controls should prevent two application teams from claiming the same FQDN.

Check its positive `Valid` condition:

```bash
kubectl -n edge-certificates get tlscertificatedelegation \
  wildcard-example-com -o yaml
```

## Reference the Namespaced Secret

An authorized HTTPProxy uses `namespace/name` in `virtualhost.tls.secretName`:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: shop
  namespace: storefront
spec:
  virtualhost:
    fqdn: shop.example.com
    tls:
      secretName: edge-certificates/wildcard-example-com-tls
  routes:
  - services:
    - name: shop
      port: 80
```

Contour validates that the Secret exists, contains usable TLS data, and is delegated to `storefront`. The certificate still must cover `shop.example.com`, but verify that separately from the certificate SAN or a real TLS client. Read both resources when the proxy is invalid:

```bash
kubectl -n storefront describe httpproxy shop
kubectl -n edge-certificates describe tlscertificatedelegation \
  wildcard-example-com
```

If Contour was started with `--watch-namespaces`, both `edge-certificates` and every referencing application namespace must be in scope. Delegation cannot make an unwatched object visible.

## Rotate Without Copying Secrets

cert-manager updates the original Secret during renewal. Contour observes the change and distributes the new certificate to Envoy, so application namespaces do not need copied Secrets or restart automation.

Monitor the source Certificate and compare it with the externally served certificate:

```bash
kubectl -n edge-certificates get certificate wildcard-example-com \
  -o jsonpath='{.status.notAfter}{" renewal="}{.status.renewalTime}{"\n"}'

openssl s_client -connect shop.example.com:443 \
  -servername shop.example.com </dev/null 2>/dev/null |
  openssl x509 -noout -serial -dates -ext subjectAltName
```

Test a controlled renewal before relying on this design for many hosts. Confirm each Envoy endpoint serves the new serial, especially when multiple external load balancers or Contour instances exist.

Deleting the old Secret before cert-manager replaces it can invalidate every dependent HTTPProxy at once. Use cert-manager's supported renewal workflow and alert well before expiry.

## Apply Least Privilege Around the Shared Identity

A wildcard private key has a broad blast radius. Protect it accordingly:

- restrict write and read RBAC in `edge-certificates`;
- delegate only to namespaces that need the identity;
- use policy to control allowed HTTPProxy FQDNs per namespace;
- audit changes to Certificate, Secret, and TLSCertificateDelegation resources;
- keep DNS-01 credentials scoped to the minimum zone and record types;
- avoid mounting the wildcard Secret into application Pods; and
- consider separate wildcard certificates for security domains with different owners.

Certificate delegation is not the same as route delegation. `HTTPProxy.includes` delegates part of a routing tree to another namespace. `TLSCertificateDelegation` authorizes use of certificate or CA Secrets across namespaces. A deployment may use both, but each solves a different trust decision.

## Revoke Access Carefully

To remove one consumer, delete its namespace from `targetNamespaces`, apply the delegation, and verify that its HTTPProxy becomes invalid while authorized consumers stay valid. Plan a maintenance window if the host is still serving production traffic.

If the key may have been exposed, revoking delegation is not enough. Reissue the certificate with a new private key, replace the Secret, and follow the certificate authority's revocation procedure. Delegation controls future Envoy configuration; it cannot invalidate a key already copied outside the cluster.

## Conclusion

Store a wildcard certificate once, delegate its Secret from the owner namespace to an explicit namespace allowlist, and reference it with `namespace/name` from each HTTPProxy. This keeps renewal centralized without making a copy of the private key for every team. Pair the feature with hostname policy, tight RBAC, and tested rotation because every delegated consumer shares one security identity.

## Official Documentation

- [Contour 1.33 TLS certificate delegation](https://projectcontour.io/docs/1.33/config/tls-delegation/)
- [Contour 1.33 TLS termination](https://projectcontour.io/docs/1.33/config/tls-termination/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [cert-manager Certificate resource](https://cert-manager.io/docs/usage/certificate/)
- [cert-manager DNS-01](https://cert-manager.io/docs/configuration/acme/dns01/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
