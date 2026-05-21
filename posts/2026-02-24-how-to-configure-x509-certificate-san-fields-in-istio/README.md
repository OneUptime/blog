# How to Configure X.509 Certificate SAN Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, X.509, Certificate, SAN, Security, mTLS

Description: Learn how to configure and customize Subject Alternative Name fields in X.509 certificates used by Istio for workload identity and mTLS.

---

Subject Alternative Name (SAN) fields in X.509 certificates are how Istio identifies workloads in the mesh. When two services establish a mutual TLS connection, they check each other's SAN to verify identity. Getting these fields right is essential for authorization policies, traffic routing, and overall mesh security.

Istio uses SPIFFE-formatted URIs as the primary SAN type for workload certificates. But there are scenarios where you need to think about other SAN entries - DNS names for ingress gateways, identities expected by external integrations, or IP addresses for specific use cases.

## Default SAN Behavior in Istio

By default, Istio sets the SAN field on workload certificates to a SPIFFE URI based on the workload's Kubernetes identity:

```text
URI: spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

For a pod running in the `production` namespace with the `payment-api` service account and a trust domain of `cluster.local`:

```text
URI: spiffe://cluster.local/ns/production/sa/payment-api
```

You can inspect the SAN on any workload's certificate:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep -A 2 "Subject Alternative Name"
```

The output will look something like:

```text
X509v3 Subject Alternative Name: critical
    URI:spiffe://cluster.local/ns/production/sa/payment-api
```

## Why SAN Configuration Matters

Authorization policies in Istio match on the SAN field. When you write a policy like this:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-payment
  namespace: production
spec:
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/checkout/sa/checkout-service"]
```

The `principals` field matches against the SPIFFE URI in the caller's certificate SAN. If the SAN does not match, the request is denied.

## Configuring Trust Domain

The trust domain is the first part of the SPIFFE URI and affects all SAN fields in the mesh. Change it from the default `cluster.local` to something meaningful for your organization:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mycompany.example.com
```

After this change, workload certificates will have SANs like:

```text
URI: spiffe://mycompany.example.com/ns/production/sa/payment-api
```

Be careful with this change in an existing mesh. Changing the trust domain means all existing certificates become invalid for authorization policy matching. Plan this as a migration.

## SAN for Istio Ingress Gateways

Ingress gateways need DNS-type SAN entries because external clients verify the server certificate against the hostname they are connecting to. You configure this through Gateway and the TLS certificate:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: my-tls-credential
      hosts:
        - "api.example.com"
        - "*.example.com"
```

The certificate referenced by `credentialName` should have the appropriate DNS SAN entries. Create it with proper SANs:

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=api.example.com" \
  -addext "subjectAltName=DNS:api.example.com,DNS:*.example.com"
```

Then store it as a Kubernetes secret:

```bash
kubectl create secret tls my-tls-credential \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

## Custom SAN for Workloads

Istio's built-in workload certificates use the SPIFFE identity format shown above. Pod proxy annotations do not add arbitrary DNS or IP SANs to those workload certificates.

If a service inside the mesh needs to present a certificate with a DNS name to an external system, use a separate application certificate, originate TLS through an egress gateway with the required client certificate, or integrate with an external identity system such as SPIRE while keeping Istio's required SPIFFE ID format for mesh identities. For example, an egress gateway can use a client credential when originating mutual TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-system-mtls
spec:
  host: external-system.example.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      credentialName: external-system-client-credential
      sni: external-system.example.com
      subjectAltNames:
        - "external-system.example.com"
```

## SAN Validation in Destination Rules

When Istio connects to upstream services, you can specify which SANs to expect on the server certificate. This is useful for connecting to services outside the mesh or in different trust domains:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: external-api.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      caCertificates: system
      sni: external-api.example.com
      subjectAltNames:
        - "external-api.example.com"
        - "*.example.com"
```

If the server certificate does not have a matching SAN, the connection will fail. For services within the mesh that use `ISTIO_MUTUAL`, leave the other TLS fields empty and enforce workload identity with authorization policy instead:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-checkout-to-payment
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/checkout/sa/checkout-service"
```

This ensures that the payment service only accepts requests from the exact workload identity you expect.

## Multi-Cluster SAN Considerations

In multi-cluster Istio setups, workloads in different clusters might have different trust domains. When configuring cross-cluster communication, you need to account for the remote cluster's SAN format:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: cluster-1.example.com
    trustDomainAliases:
      - cluster-2.example.com
```

With trust domain aliases, Istio can treat identities from the listed trust domains as aliases for authorization checks during trust-domain migration or multi-cluster setups.

## Debugging SAN Issues

When you hit certificate verification errors, the SAN field is often the culprit. Here is how to debug:

Check the certificate on a specific connection:

```bash
# Get the certificate from a running connection

kubectl exec <pod-name> -c istio-proxy -- \
  openssl s_client -connect <target-service>:443 -showcerts 2>/dev/null | \
  openssl x509 -text -noout | grep -A 5 "Subject Alternative Name"
```

Look at Envoy access logs for TLS errors:

```bash
kubectl logs <pod-name> -c istio-proxy | grep "TLS error"
```

Check what SAN the proxy expects when connecting to a service:

```bash
istioctl proxy-config cluster <pod-name> -o json | \
  jq '.[] | select(.name | contains("payment")) | .transportSocket'
```

This will show the TLS context including the expected subject alt names for that upstream cluster.

## Certificate Generation with Specific SANs

If you are providing your own CA certificates (plug-in CA mode), the CA certificate signs workload certificates, but it is not where you put workload DNS or SPIFFE identities. Use Istio's plug-in CA flow to provide the CA certificate, key, root certificate, and certificate chain:

```bash
make -f ../tools/certs/Makefile.selfsigned.mk root-ca
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts

kubectl create namespace istio-system
kubectl create secret generic cacerts -n istio-system \
  --from-file=cluster1/ca-cert.pem \
  --from-file=cluster1/ca-key.pem \
  --from-file=cluster1/root-cert.pem \
  --from-file=cluster1/cert-chain.pem
```

Getting SAN fields right is one of those things that seems straightforward until it breaks at 2 AM. Take the time to understand what SANs your workloads carry, what your authorization policies expect, and what your destination rules verify. It will save you hours of debugging later.
