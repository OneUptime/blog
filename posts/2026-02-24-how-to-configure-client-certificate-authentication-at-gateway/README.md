# How to Configure Client Certificate Authentication at Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Client Certificate, Gateway, Security

Description: How to set up mutual TLS authentication at the Istio ingress gateway to require client certificates for secure API access and zero-trust network security.

---

Standard TLS only authenticates the server to the client. The client verifies the server's certificate to make sure it is talking to the right server, but the server does not verify the client's identity. Mutual TLS (mTLS) goes both ways: the server also requires the client to present a valid certificate. This is useful for API-to-API communication, B2B integrations, and zero-trust architectures where you want to verify the identity of every caller.

Istio's ingress gateway supports mutual TLS out of the box. You can require client certificates for all traffic or just for specific hosts.

## How Client Certificate Authentication Works

1. Client connects to the Istio gateway on port 443
2. Server presents its TLS certificate (same as regular HTTPS)
3. Server requests a client certificate
4. Client presents its certificate
5. Server validates the client certificate against a trusted CA
6. If validation passes, the connection is established
7. The client certificate's subject/SAN can be used for authorization

## Setting Up the Certificate Authority

You need a CA to sign both the server and client certificates. For production, use your organization's PKI. For testing, create a simple CA:

```bash
# Generate CA private key
openssl genrsa -out ca.key 4096

# Generate CA certificate
openssl req -x509 -new -nodes -key ca.key \
  -sha256 -days 3650 -out ca.crt \
  -subj "/CN=My Custom CA/O=MyOrg"
```

## Creating the Server Certificate

Generate a server certificate signed by your CA:

```bash
# Generate server key
openssl genrsa -out server.key 4096

# Generate CSR
openssl req -new -key server.key \
  -out server.csr \
  -subj "/CN=api.example.com"

# Sign with CA
openssl x509 -req -in server.csr \
  -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt \
  -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:api.example.com")
```

## Creating Client Certificates

Create certificates for each client that needs access:

```bash
# Generate client key
openssl genrsa -out client.key 4096

# Generate CSR with client identity
openssl req -new -key client.key \
  -out client.csr \
  -subj "/CN=partner-service/O=PartnerOrg"

# Sign with CA
openssl x509 -req -in client.csr \
  -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out client.crt \
  -days 365 -sha256
```

## Creating Kubernetes Secrets

Store the certificates as Kubernetes secrets in the `istio-system` namespace:

```bash
# Server certificate secret
kubectl create secret tls server-cert \
  --cert=server.crt \
  --key=server.key \
  -n istio-system

# CA certificate as a generic secret (for verifying client certs)
kubectl create secret generic ca-cert \
  --from-file=ca.crt=ca.crt \
  -n istio-system
```

For mTLS, you need a special secret format that includes the CA certificate. Create a combined secret:

```bash
kubectl create -n istio-system secret generic api-credential \
  --from-file=tls.key=server.key \
  --from-file=tls.crt=server.crt \
  --from-file=ca.crt=ca.crt
```

## Configuring the Gateway for Mutual TLS

Set the TLS mode to `MUTUAL` on the Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: mtls-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: MUTUAL
        credentialName: api-credential
      hosts:
        - "api.example.com"
```

The `MUTUAL` mode tells the gateway to require a client certificate. The `credentialName` points to the secret that contains the server certificate, server key, and CA certificate for validating client certificates.

## Testing the Configuration

Test without a client certificate (this should fail):

```bash
export GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl -v --resolve api.example.com:443:$GATEWAY_IP \
  --cacert ca.crt \
  https://api.example.com/
```

You should see an error like `SSL peer certificate or SSH remote key was not OK` or `alert certificate required`.

Test with a client certificate (this should work):

```bash
curl -v --resolve api.example.com:443:$GATEWAY_IP \
  --cacert ca.crt \
  --cert client.crt \
  --key client.key \
  https://api.example.com/
```

## Routing Traffic After Authentication

Create a VirtualService to route authenticated traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-vs
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - mtls-gateway
  http:
    - route:
        - destination:
            host: api-service.default.svc.cluster.local
            port:
              number: 80
```

## Authorization Based on Client Certificate

After the TLS handshake, the client certificate's subject information is available for authorization decisions. Istio extracts the client certificate's SAN and makes it available in the request context.

Use an AuthorizationPolicy to allow only specific clients:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-client-cert
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - istio-system
      when:
        - key: connection.uri_san_peer_certificate
          values:
            - "spiffe://cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"
```

For more granular control based on the client certificate's subject, you can use an EnvoyFilter to extract the certificate details and add them as headers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: client-cert-headers
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            forward_client_cert_details: SANITIZE_SET
            set_current_client_cert_details:
              subject: true
              dns: true
              uri: true
```

This adds the client certificate details as the `x-forwarded-client-cert` (XFCC) header, which your backend services can inspect for authorization decisions.

## Mixed Mode: Optional Client Certificates

Sometimes you want to accept client certificates if provided but not require them. Use `OPTIONAL_MUTUAL` mode:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: optional-mtls-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: OPTIONAL_MUTUAL
        credentialName: api-credential
      hosts:
        - "api.example.com"
```

With `OPTIONAL_MUTUAL`, clients with valid certificates are authenticated, and clients without certificates are allowed through but treated as unauthenticated. Your backend can then check the XFCC header to determine if the client was authenticated.

## Certificate Rotation

When client certificates expire, you need to issue new ones. Since the CA stays the same, the gateway configuration does not change. Just generate new client certificates signed by the same CA.

To rotate the server certificate:

```bash
# Generate new server certificate
openssl genrsa -out server-new.key 4096
openssl req -new -key server-new.key -out server-new.csr -subj "/CN=api.example.com"
openssl x509 -req -in server-new.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server-new.crt -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:api.example.com")

# Update the secret
kubectl create -n istio-system secret generic api-credential \
  --from-file=tls.key=server-new.key \
  --from-file=tls.crt=server-new.crt \
  --from-file=ca.crt=ca.crt \
  --dry-run=client -o yaml | kubectl apply -f -
```

Istio's SDS picks up the change automatically without requiring a gateway restart.

## Summary

Client certificate authentication at the Istio gateway provides strong identity verification for API clients. Set the Gateway TLS mode to `MUTUAL`, provide the CA certificate for client validation through a combined credential secret, and optionally extract client certificate details into headers for fine-grained authorization. For flexibility, use `OPTIONAL_MUTUAL` mode to support both authenticated and unauthenticated clients. Certificate rotation is handled by updating the Kubernetes secrets, which Istio's SDS picks up automatically.
