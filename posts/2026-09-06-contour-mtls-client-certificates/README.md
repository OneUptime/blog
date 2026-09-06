# Require Client Certificates with Contour mTLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, mTLS, Client Certificate, Certificate Authentication, TLS, HTTPProxy, Envoy

Description: Require and validate client certificates at a Contour TLS virtual host, then pass only needed identity details upstream.

---

Contour can make Envoy require a client certificate during the public TLS handshake. Configure `virtualhost.tls.clientValidation` with the CA that issued approved client certificates. Envoy then verifies the certificate's validity and chain before an HTTP request reaches the backend.

This is downstream mTLS, between the external client and Envoy. It is independent of upstream TLS between Envoy and the application.

## Build a Client Trust Bundle

Create an Opaque Secret containing only a PEM CA bundle at `ca.crt`:

```bash
kubectl -n partner-api create secret generic partner-client-ca \
  --from-file=ca.crt=./trusted-client-ca-chain.pem \
  --dry-run=client -o yaml
```

Apply it through your normal secret workflow after inspection. Do not include a CA private key. Contour ignores `tls.crt` and `tls.key` if they are accidentally present in this CA Secret, but their presence is still an unnecessary secret-handling risk.

The bundle defines who can establish TLS, not what each identity may do. If several clients chain to one CA, all of them pass this transport check unless you add an external authorization or application policy based on certificate identity.

## Require Certificates on the Virtual Host

The server certificate and client CA are separate Secret references:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: partner-api
  namespace: partner-api
spec:
  virtualhost:
    fqdn: partner-api.example.com
    tls:
      secretName: partner-api-server-tls
      clientValidation:
        caSecret: partner-client-ca
  routes:
  - services:
    - name: partner-api
      port: 8080
```

With `caSecret` configured and `optionalClientCertificate` omitted, a client certificate is required. Contour checks that the CA Secret exists and contains a nonempty PEM certificate bundle before marking the HTTPProxy valid. Envoy performs the certificate validation; HTTPProxy validity alone does not prove the trust bundle works.

TLS passthrough cannot provide this edge validation because Envoy does not terminate the handshake. If the backend must terminate TLS itself, configure client verification there and use `tls.passthrough: true` with `spec.tcpproxy` on the HTTPProxy instead.

## Forward Only the Identity Data the App Needs

The backend may need a subject or URI SAN for application authorization. Contour can create a sanitized `x-forwarded-client-cert` header after successful TLS validation:

```yaml
      clientValidation:
        caSecret: partner-client-ca
        forwardClientCertificate:
          subject: true
          uri: true
```

Contour removes any client-supplied XFCC header before adding its own. Select the minimum fields required. Forwarding the full certificate or chain can create large headers, disclose unnecessary data, and exceed application header limits.

The application must trust identity headers only from Envoy. NetworkPolicy should prevent clients from reaching the backend Service or Pod directly, where they could bypass TLS validation and supply their own headers.

For authorization by subject, SAN, or organization, either validate the sanitized values carefully in the application or use an external authorization service. The forwarded subject and URI SAN do not contain revocation status; use CRL checking at Envoy or provide certificate data and a revocation source to the application or authorization service for that check. Certificate subjects are structured names; unsafe string parsing can create identity collisions.

## Test Required, Trusted, and Untrusted Cases

Test without a certificate:

```bash
curl -v https://partner-api.example.com/healthz
```

The TLS handshake should fail before an HTTP response from the application. Then use a trusted client certificate and its private key:

```bash
curl --fail --show-error --verbose \
  --cert ./partner-a.crt \
  --key ./partner-a.key \
  https://partner-api.example.com/healthz
```

Finally, test a certificate signed by an untrusted CA and an expired test certificate. A revoked certificate is rejected only after CRL checking is configured as described below. Keep real private keys out of command history, CI logs, and shared workstations. Hardware-backed keys or a secure agent are preferable for operational clients.

Do not use `-k`; it disables verification of Envoy's server certificate and turns a mutual verification test into only a client-authentication test.

## Add Revocation Checking When Your PKI Supports It

Contour can consume PEM Certificate Revocation Lists from an Opaque Secret with a `crl.pem` key:

```yaml
      clientValidation:
        caSecret: partner-client-ca
        crlSecret: partner-client-crl
```

The CRL set must cover relevant issuing CAs, including intermediates. If a complete chain of CRLs is not available, clients can be denied. `crlOnlyVerifyLeafCert: true` narrows the check to the leaf certificate, but use it only when that matches the PKI's documented revocation design.

After configuring the CRL Secret, test a deliberately revoked certificate as a separate negative case. Revocation at the CA does not inform Envoy until the referenced Secret contains the updated CRL.

Kubernetes Secrets are limited in size, so very large CRLs are not suitable. Monitor CRL freshness and HTTPProxy validity as part of the certificate lifecycle.

## Avoid Unsafe Optional and Skip Modes

`optionalClientCertificate: true` requests a certificate but allows a connection with none. This is appropriate only when another authentication method intentionally shares the same host. The application must distinguish missing identity safely.

`skipClientCertValidation: true` tells Envoy not to verify the presented certificate. Contour documents this for use with an external authorization server that performs validation. It is not a troubleshooting switch. With `caSecret` still present, Envoy requires a certificate but leaves verification to that external service.

If an incident tempts you to enable either setting globally, create a separate hostname or narrowly scoped migration instead. A permissive TLS handshake expands access before application code has a chance to compensate.

## Diagnose Rejections

Check the control plane first:

```bash
kubectl -n partner-api describe httpproxy partner-api
kubectl -n partner-api get secret partner-client-ca \
  -o go-template='{{.type}}{{" keys="}}{{range $k, $v := .data}}{{$k}}{{" "}}{{end}}{{"\n"}}'
```

Then inspect Envoy TLS metrics and temporary debug logs for handshake failures. A request rejected in the handshake will not appear in application logs. Common causes include an incomplete client chain, the wrong trust bundle, expiration, clock skew, a stale CRL, and clients that never sent a certificate.

If the CA Secret is centralized in another namespace, use `namespace/name` plus a `TLSCertificateDelegation` in the CA Secret's namespace. Delegation is required for cross-namespace CA references just as it is for server certificates.

## Conclusion

Contour mTLS is a strong transport gate when Envoy terminates TLS. Put the approved client CA bundle in an Opaque Secret, require it with `clientValidation.caSecret`, and prove that missing and untrusted certificates fail. Forward only the identity fields the backend needs, block direct backend access, and add explicit authorization when CA membership alone is too broad.

## Official Documentation

- [Contour 1.33 TLS client certificate validation](https://projectcontour.io/docs/1.33/config/tls-termination/)
- [Contour 1.33 external authorization](https://projectcontour.io/docs/1.33/guides/external-authorization/)
- [Contour 1.33 TLS certificate delegation](https://projectcontour.io/docs/1.33/config/tls-delegation/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Envoy TLS certificate validation](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ssl)
