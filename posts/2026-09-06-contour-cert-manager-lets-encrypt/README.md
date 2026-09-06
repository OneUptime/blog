# Issue and Renew Let's Encrypt Certificates for Contour

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, Cert-Manager, Let's Encrypt, ACME, Certificate Renewal, TLS, Kubernetes

Description: Issue a Contour TLS Secret with cert-manager, prove HTTP-01 routing, and monitor safe automatic renewals.

---

An HTTPProxy consumes a normal Kubernetes TLS Secret. cert-manager creates and renews that Secret after completing an ACME challenge with Let's Encrypt. Neither controller needs a private integration with the other:

1. a `Certificate` asks cert-manager for a DNS name;
2. cert-manager completes HTTP-01 or DNS-01 validation;
3. cert-manager stores `tls.crt` and `tls.key` in the requested Secret; and
4. Contour observes the Secret and updates Envoy.

For HTTPProxy, create an explicit `Certificate`. cert-manager's ingress-shim annotations operate on Ingress resources, not HTTPProxy resources.

## Make HTTP-01 Reachable

HTTP-01 works only when public DNS for the requested name reaches Envoy on port 80 and cert-manager's temporary solver Ingress is handled by Contour. Create a solver with the current `ingressClassName` field:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    email: platform@example.com
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-staging-account
    solvers:
    - http01:
        ingress:
          ingressClassName: contour-public
```

The class must match the public Contour instance. Omitting all solver class settings causes cert-manager to create an unclassified Ingress that every ingress controller may serve, which can add cost and make challenge routing nondeterministic.

Use Let's Encrypt staging while proving DNS, routing, and policy. Its certificates are intentionally untrusted. Move to the production directory only after the complete flow succeeds, which avoids unnecessary production rate-limit consumption.

HTTP-01 cannot issue wildcard certificates. Use a DNS-01 solver for `*.example.com` and grant its DNS credentials the narrowest zone permissions possible.

## Create the Certificate and HTTPProxy

Keep the Certificate in the same namespace as the HTTPProxy. cert-manager writes its Secret into that namespace:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: shop-example-com
  namespace: storefront
spec:
  secretName: shop-example-com-tls
  dnsNames:
  - shop.example.com
  issuerRef:
    name: letsencrypt-staging
    kind: ClusterIssuer
    group: cert-manager.io
  privateKey:
    rotationPolicy: Always
---
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: shop
  namespace: storefront
spec:
  ingressClassName: contour-public
  virtualhost:
    fqdn: shop.example.com
    tls:
      secretName: shop-example-com-tls
  routes:
  - services:
    - name: shop
      port: 80
```

The HTTPProxy can be temporarily invalid while the Secret does not exist. That is expected during first issuance. Do not create a placeholder Secret with an unrelated certificate, since that can hide challenge and hostname mistakes.

Apply the resources and follow the cert-manager chain:

```bash
kubectl apply -f shop-tls.yaml
kubectl get clusterissuer letsencrypt-staging
kubectl -n storefront get certificate,certificaterequest,order,challenge
kubectl -n storefront describe certificate shop-example-com
```

For an HTTP-01 failure, inspect the temporary Ingress, Service, and solver Pod before they are cleaned up:

```bash
kubectl -n storefront get ingress,service,pod \
  -l acme.cert-manager.io/http01-solver=true -o wide
kubectl -n storefront describe challenge
```

NetworkPolicy must allow Envoy to reach the solver Pod and the Kubernetes API server to reach the cert-manager webhook.

## Test the Challenge Path from Outside

Let's Encrypt validates from outside your cluster. An internal curl is not enough if split-horizon DNS, NAT, a CDN, or a firewall changes the public path.

Check authoritative DNS and the public listener:

```bash
dig +short shop.example.com A
dig +short shop.example.com AAAA
curl -I http://shop.example.com/.well-known/acme-challenge/test
```

A test token need not return 200, but it must reach the intended public Contour instead of another controller or a network-level block. If both A and AAAA records exist, both paths must be usable; a stale IPv6 record can break validation even when IPv4 works.

Contour normally redirects HTTP to HTTPS when an HTTPProxy has TLS, while the temporary solver Ingress owns the specific challenge path. Avoid custom blanket redirects at a CDN or upstream load balancer that prevent the solver route from being reached.

## Promote to Production Safely

Create a separate production ClusterIssuer using the production ACME directory:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: platform@example.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-account
    solvers:
    - http01:
        ingress:
          ingressClassName: contour-public
```

Then change only the Certificate's `issuerRef.name` to `letsencrypt-prod`. cert-manager reissues it and updates the same Secret. Wait for `Ready=True` before calling the migration complete:

```bash
kubectl -n storefront wait certificate/shop-example-com \
  --for=condition=Ready --timeout=5m
kubectl -n storefront wait httpproxy/shop \
  --for=condition=Valid --timeout=60s
```

Verify the served certificate from outside without disabling trust checks:

```bash
openssl s_client -connect shop.example.com:443 \
  -servername shop.example.com </dev/null 2>/dev/null |
  openssl x509 -noout -subject -issuer -dates -ext subjectAltName
curl --fail --show-error https://shop.example.com/healthz
```

## Monitor Renewal, Not Just Initial Issuance

cert-manager calculates and records a renewal time, renews before expiry, and writes a reissued certificate to the Secret. The default schedule is based on the issued certificate's lifetime when neither `renewBefore` nor `renewBeforePercentage` is specified.

Monitor these values:

```bash
kubectl -n storefront get certificate shop-example-com -o json |
  jq '{ready: [.status.conditions[]? | select(.type == "Ready")],
       notAfter: .status.notAfter,
       renewalTime: .status.renewalTime,
       revision: .status.revision}'
```

Alert with enough lead time to investigate a failed Order or Challenge. Also test one controlled renewal:

```bash
cmctl renew -n storefront shop-example-com
kubectl -n storefront get certificate,certificaterequest --watch
```

Do not delete the TLS Secret as the routine renewal mechanism. cert-manager documents `cmctl renew` as the supported manual trigger. Deletion creates an avoidable interval with no Secret and can make the HTTPProxy invalid.

After renewal, compare the Secret certificate's serial and expiry with the certificate actually served by every Envoy entry point. This catches a stale load balancer target or an instance no longer receiving Contour configuration.

## Conclusion

The reliable Contour pattern is an explicit Certificate and a same-namespace TLS Secret. Give the HTTP-01 solver the correct Contour ingress class, prove the public challenge path with staging, then promote to a separate production issuer. Monitor cert-manager's renewal time and confirm that Envoy serves the new certificate after a controlled renewal.

## Official Documentation

- [Contour 1.33 cert-manager guide](https://projectcontour.io/docs/1.33/guides/cert-manager/)
- [Contour 1.33 TLS termination](https://projectcontour.io/docs/1.33/config/tls-termination/)
- [cert-manager Certificate resource](https://cert-manager.io/docs/usage/certificate/)
- [cert-manager ACME HTTP-01](https://cert-manager.io/docs/configuration/acme/http01/)
- [cert-manager ACME issuers](https://cert-manager.io/docs/configuration/acme/)
- [Let's Encrypt challenge types](https://letsencrypt.org/docs/challenge-types/)
