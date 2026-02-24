# How to Configure X.509 Certificate SAN Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, X.509, Certificates, SAN, Security, mTLS

Description: Learn how to configure and customize Subject Alternative Name fields in X.509 certificates used by Istio for workload identity and mTLS.

---

Subject Alternative Name (SAN) fields in X.509 certificates are how Istio identifies workloads in the mesh. When two services establish a mutual TLS connection, they check each other's SAN to verify identity. Getting these fields right is essential for authorization policies, traffic routing, and overall mesh security.

Istio uses SPIFFE-formatted URIs as the primary SAN type for workload certificates. But there are scenarios where you need additional SAN entries - DNS names for ingress gateways, custom identities for external integrations, or IP addresses for specific use cases.

## Default SAN Behavior in Istio

By default, Istio sets the SAN field on workload certificates to a SPIFFE URI based on the workload's Kubernetes identity:

```
URI: spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

For a pod running in the `production` namespace with the `payment-api` service account and a trust domain of `cluster.local`:

```
URI: spiffe://cluster.local/ns/production/sa/payment-api
```

You can inspect the SAN on any workload's certificate:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep -A 2 "Subject Alternative Name"
```

The output will look something like:

```
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

```
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

There are cases where you need workload certificates to include additional SAN entries beyond the default SPIFFE URI. For instance, when a service inside the mesh needs to present a certificate with a DNS name to an external system.

You can request additional SANs through proxy configuration annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            ISTIO_META_TLS_CLIENT_CERTIFICATE_SAN: "DNS:my-service.example.com"
    spec:
      containers:
        - name: my-service
          image: my-service:latest
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
      subjectAltNames:
        - "DNS:external-api.example.com"
        - "DNS:*.example.com"
```

If the server certificate does not have a matching SAN, the connection will fail. You can also use this for services within the mesh to enforce stricter identity verification:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
      subjectAltNames:
        - "spiffe://cluster.local/ns/production/sa/payment-api"
```

This ensures that even if mTLS is established, the connection only succeeds if the server has the exact identity you expect.

## Multi-Cluster SAN Considerations

In multi-cluster Istio setups, workloads in different clusters might have different trust domains. When configuring cross-cluster communication, you need to account for the remote cluster's SAN format:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: remote-service
spec:
  host: remote-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
      subjectAltNames:
        - "spiffe://cluster-1.example.com/ns/production/sa/remote-service"
        - "spiffe://cluster-2.example.com/ns/production/sa/remote-service"
```

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

If you are providing your own CA certificates (plug-in CA mode), make sure the intermediate CA certificate has appropriate SANs. Generate one with both URI and DNS SANs:

```bash
openssl req -new -key ca-key.pem -out ca-csr.pem \
  -subj "/O=MyOrg/CN=Istio Intermediate CA" \
  -addext "subjectAltName=URI:spiffe://mycompany.example.com,DNS:istiod.istio-system.svc"

openssl x509 -req -in ca-csr.pem -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -out ca-cert.pem -days 730 \
  -extfile <(printf "subjectAltName=URI:spiffe://mycompany.example.com\nbasicConstraints=CA:TRUE\nkeyUsage=keyCertSign,cRLSign")
```

Getting SAN fields right is one of those things that seems straightforward until it breaks at 2 AM. Take the time to understand what SANs your workloads carry, what your authorization policies expect, and what your destination rules verify. It will save you hours of debugging later.
