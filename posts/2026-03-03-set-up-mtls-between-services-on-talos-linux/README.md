# How to Set Up mTLS Between Services on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, mTLS, Security, Kubernetes, Service Mesh, Zero Trust

Description: Learn how to implement mutual TLS authentication between Kubernetes services on Talos Linux for zero-trust service-to-service communication.

---

Mutual TLS (mTLS) takes standard TLS a step further by requiring both the client and server to present certificates during the handshake. In a standard HTTPS connection, only the server proves its identity. With mTLS, both sides verify each other. This is a fundamental building block for zero-trust networking in Kubernetes, where you assume that the network itself is not trustworthy and every service must authenticate itself to every other service it communicates with.

On Talos Linux, implementing mTLS between services is both practical and important. Talos already provides a secure foundation at the OS level, and mTLS extends that security to the application layer. This guide covers multiple approaches to setting up mTLS on a Talos Linux cluster.

## Why mTLS Matters

In a Kubernetes cluster, pods communicate over a shared network. Without mTLS, any pod that can reach another pod's network address can send requests to it. This means a compromised pod could impersonate any other service. mTLS prevents this by requiring cryptographic proof of identity on both sides of every connection.

The benefits include:

- Identity verification for both client and server
- Encrypted communication preventing eavesdropping
- Protection against man-in-the-middle attacks
- Foundation for authorization policies based on service identity
- Compliance with security frameworks that require encrypted internal traffic

## Approach 1: mTLS with a Service Mesh

The easiest way to get mTLS between all services is through a service mesh. Both Linkerd and Istio provide automatic mTLS without any changes to your application code.

### Using Linkerd for Automatic mTLS

Install Linkerd and inject the sidecar into your workloads:

```bash
# Install Linkerd (assuming it's already set up)
# Inject the proxy into your namespace
kubectl annotate namespace default linkerd.io/inject=enabled

# Restart deployments to pick up the sidecar
kubectl rollout restart deployment -n default
```

Verify mTLS is active:

```bash
# Check mTLS connections
linkerd viz edges -n default

# Tap traffic to see TLS status
linkerd viz tap deployment/my-app -n default
```

With Linkerd, mTLS is enabled by default for all meshed services. You do not need to configure certificates manually - Linkerd handles the entire certificate lifecycle.

### Using Istio for mTLS

If you prefer Istio, you can enforce mTLS with a PeerAuthentication policy:

```yaml
# strict-mtls.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

This forces all services in the namespace to use mTLS. Istio's control plane manages the certificates.

## Approach 2: Application-Level mTLS with cert-manager

If you do not want to deploy a service mesh, you can implement mTLS at the application level using certificates issued by cert-manager.

### Setting Up the Internal CA

First, create a certificate authority:

```yaml
# internal-ca.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: internal-ca
  secretName: internal-ca-key
  duration: 87600h
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: selfsigned
    kind: ClusterIssuer
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca-issuer
spec:
  ca:
    secretName: internal-ca-key
```

### Issuing Service Certificates

Create certificates for each service:

```yaml
# server-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-server-cert
  namespace: default
spec:
  secretName: api-server-tls
  duration: 720h
  renewBefore: 168h
  issuerRef:
    name: internal-ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - api-server
  - api-server.default.svc.cluster.local
  usages:
  - server auth
  - client auth  # Both usages for mTLS

---
# client-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: web-client-cert
  namespace: default
spec:
  secretName: web-client-tls
  duration: 720h
  renewBefore: 168h
  issuerRef:
    name: internal-ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - web-client
  - web-client.default.svc.cluster.local
  usages:
  - client auth
  - server auth
```

### Configuring the Server for mTLS

Here is an example using Nginx as the server with mTLS:

```yaml
# mtls-server.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-mtls-config
  namespace: default
data:
  default.conf: |
    server {
        listen 443 ssl;
        server_name api-server;

        # Server certificate and key
        ssl_certificate /etc/tls/server/tls.crt;
        ssl_certificate_key /etc/tls/server/tls.key;

        # Client certificate verification
        ssl_client_certificate /etc/tls/ca/ca.crt;
        ssl_verify_client on;
        ssl_verify_depth 2;

        location / {
            return 200 'mTLS verified! Client: $ssl_client_s_dn\n';
            add_header Content-Type text/plain;
        }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 443
        volumeMounts:
        - name: server-tls
          mountPath: /etc/tls/server
          readOnly: true
        - name: ca-cert
          mountPath: /etc/tls/ca
          readOnly: true
        - name: nginx-config
          mountPath: /etc/nginx/conf.d
      volumes:
      - name: server-tls
        secret:
          secretName: api-server-tls
      - name: ca-cert
        secret:
          secretName: internal-ca-key
          items:
          - key: tls.crt
            path: ca.crt
      - name: nginx-config
        configMap:
          name: nginx-mtls-config
```

### Configuring the Client for mTLS

The client application needs to present its certificate when connecting:

```yaml
# mtls-client.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-client
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-client
  template:
    metadata:
      labels:
        app: web-client
    spec:
      containers:
      - name: client
        image: curlimages/curl
        command: ["sleep", "infinity"]
        volumeMounts:
        - name: client-tls
          mountPath: /etc/tls/client
          readOnly: true
        - name: ca-cert
          mountPath: /etc/tls/ca
          readOnly: true
      volumes:
      - name: client-tls
        secret:
          secretName: web-client-tls
      - name: ca-cert
        secret:
          secretName: internal-ca-key
          items:
          - key: tls.crt
            path: ca.crt
```

Test the mTLS connection:

```bash
# Exec into the client pod and make a request with mutual TLS
kubectl exec -it deployment/web-client -- \
  curl --cert /etc/tls/client/tls.crt \
       --key /etc/tls/client/tls.key \
       --cacert /etc/tls/ca/ca.crt \
       https://api-server.default.svc.cluster.local
```

## Approach 3: mTLS with SPIFFE/SPIRE

SPIFFE (Secure Production Identity Framework For Everyone) provides a standardized way to issue and verify service identities. SPIRE is its implementation:

```bash
# Install SPIRE on your Talos cluster
helm repo add spiffe https://spiffe.github.io/helm-charts-hardened/
helm install spire spiffe/spire \
  --namespace spire \
  --create-namespace
```

SPIRE issues short-lived X.509 certificates (SVIDs) to workloads based on their identity, without requiring certificate management in your application code.

## Verifying mTLS is Working

Regardless of which approach you use, verify mTLS is active:

```bash
# For service mesh approach - check encrypted connections
linkerd viz tap deployment/api-server -n default | grep tls

# For application-level approach - test without client cert (should fail)
kubectl exec -it deployment/web-client -- \
  curl --cacert /etc/tls/ca/ca.crt \
       https://api-server.default.svc.cluster.local
# This should return a 400 error because no client certificate was provided

# Test with client cert (should succeed)
kubectl exec -it deployment/web-client -- \
  curl --cert /etc/tls/client/tls.crt \
       --key /etc/tls/client/tls.key \
       --cacert /etc/tls/ca/ca.crt \
       https://api-server.default.svc.cluster.local
```

## Talos Linux Security Benefits

Talos Linux enhances mTLS security in several ways:

1. The immutable filesystem prevents certificate tampering at the node level
2. No shell access means credentials cannot be extracted from nodes
3. The minimal attack surface reduces the risk of proxy compromise
4. etcd encryption protects certificate secrets at rest

## Conclusion

mTLS between services on Talos Linux is an important security measure for production workloads. The service mesh approach is the simplest - Linkerd or Istio handle everything automatically. For teams that do not want a full service mesh, cert-manager with application-level TLS configuration provides a lighter-weight alternative. Whichever approach you choose, the combination of mTLS with Talos Linux's inherent security gives you a strong zero-trust foundation for your Kubernetes infrastructure.
