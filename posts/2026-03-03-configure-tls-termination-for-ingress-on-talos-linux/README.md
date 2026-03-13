# How to Configure TLS Termination for Ingress on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TLS, Ingresses, HTTPS, Kubernetes, Security

Description: Learn how to configure TLS termination at the ingress layer on Talos Linux to secure external traffic to your Kubernetes services.

---

Securing traffic with TLS is not optional in production environments. When you expose services through a Kubernetes ingress controller, you need to terminate TLS at some point in the request chain. On Talos Linux, TLS termination at the ingress layer is the most common and practical approach. The ingress controller handles the SSL/TLS handshake, decrypts the traffic, and forwards plain HTTP to your backend services. This simplifies certificate management and keeps your application code free of TLS concerns.

This guide covers how to configure TLS termination for ingress on Talos Linux, including creating TLS secrets, configuring different ingress controllers, and handling common scenarios like redirect and passthrough.

## TLS Termination Explained

TLS termination means the ingress controller is the endpoint for the encrypted connection. The client establishes a TLS connection with the ingress controller, which then decrypts the traffic and forwards it to backend pods over plain HTTP within the cluster network. This approach works well because:

1. You manage certificates in one place rather than in every application
2. Backend services do not need TLS configuration
3. The ingress controller can inspect HTTP headers and route traffic based on path, host, and other attributes
4. Certificate rotation only affects the ingress layer

There is also TLS passthrough, where the ingress controller forwards encrypted traffic directly to the backend without decrypting it. We will cover both approaches.

## Prerequisites

You need:

- A Talos Linux cluster with an ingress controller installed (Nginx, Traefik, or any other)
- `kubectl` access to the cluster
- A TLS certificate and private key (self-signed for testing, or a real certificate for production)
- `openssl` installed locally for generating test certificates

## Creating TLS Certificates for Testing

For development and testing, generate a self-signed certificate:

```bash
# Generate a self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key \
  -out tls.crt \
  -subj "/CN=*.example.com/O=MyOrg"

# Create a Kubernetes TLS secret
kubectl create secret tls example-tls \
  --cert=tls.crt \
  --key=tls.key \
  -n default
```

For production, you would get certificates from a certificate authority or use cert-manager with Let's Encrypt (covered in a separate post).

## TLS Termination with Nginx Ingress

If you are using the Nginx Ingress Controller, TLS termination is configured directly in the Ingress resource:

```yaml
# tls-ingress-nginx.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-app
  namespace: default
  annotations:
    # Force HTTPS redirect
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Set minimum TLS version
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.com
    secretName: example-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app
            port:
              number: 80
```

The `tls` section tells the ingress controller which certificate to use for which hostnames. The `ssl-redirect` annotation ensures HTTP traffic is automatically redirected to HTTPS.

## TLS Termination with Traefik

For Traefik, you can use either the standard Ingress resource or Traefik's IngressRoute CRD:

```yaml
# tls-ingressroute-traefik.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: secure-app
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`app.example.com`)
    kind: Rule
    services:
    - name: my-app
      port: 80
  tls:
    secretName: example-tls
    options:
      name: tls-options
---
# Define TLS options
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: tls-options
  namespace: default
spec:
  minVersion: VersionTLS12
  cipherSuites:
    - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
```

## HTTP to HTTPS Redirect

Redirecting HTTP to HTTPS is a common requirement. Here is how to set it up with different ingress controllers:

### Nginx Ingress

```yaml
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: "true"
  nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
```

### Traefik

```yaml
# Create a redirect middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-to-https
  namespace: default
spec:
  redirectScheme:
    scheme: https
    permanent: true

---
# Apply to HTTP entrypoint
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: http-redirect
  namespace: default
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`app.example.com`)
    kind: Rule
    middlewares:
    - name: redirect-to-https
    services:
    - name: noop@internal
      kind: TraefikService
```

## TLS Passthrough

Sometimes you need the backend service to handle TLS directly. This is common for applications that require end-to-end encryption or need to inspect the client certificate. With Nginx Ingress:

```yaml
# tls-passthrough.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: passthrough-app
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - secure.example.com
  rules:
  - host: secure.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-tls-app
            port:
              number: 443
```

Note that SSL passthrough must be enabled in the Nginx Ingress Controller configuration:

```bash
# Enable passthrough in Helm values
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.extraArgs.enable-ssl-passthrough=true
```

## Multiple TLS Certificates

You can use different certificates for different hostnames on the same ingress:

```yaml
# multi-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-domain
  namespace: default
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app1.example.com
    secretName: app1-tls
  - hosts:
    - app2.example.com
    secretName: app2-tls
  rules:
  - host: app1.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app1
            port:
              number: 80
  - host: app2.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app2
            port:
              number: 80
```

## Verifying TLS Configuration

After setting up TLS, verify it is working correctly:

```bash
# Test the TLS connection
curl -v https://app.example.com --resolve app.example.com:443:<NODE_IP>

# Check the certificate details
openssl s_client -connect <NODE_IP>:443 -servername app.example.com

# Verify redirect from HTTP to HTTPS
curl -v http://app.example.com --resolve app.example.com:80:<NODE_IP>
```

## Talos-Specific Notes

On Talos Linux, TLS secrets are stored in etcd like all other Kubernetes secrets. Make sure your etcd encryption is configured for secrets at rest. You can verify this in your Talos machine configuration:

```yaml
# Talos machine config - cluster section
cluster:
  secretboxEncryptionSecret: <your-encryption-key>
```

Since Talos nodes do not have a filesystem you can write to, you cannot store certificates on the host. Everything must go through Kubernetes secrets, which is the right approach anyway.

## Conclusion

TLS termination at the ingress layer is the standard approach for securing external traffic to Kubernetes services on Talos Linux. Whether you use Nginx, Traefik, or another ingress controller, the process follows the same pattern: create a TLS secret, reference it in your ingress resource, and optionally configure HTTP-to-HTTPS redirect. The immutable nature of Talos Linux reinforces good practices by requiring all certificate management to happen through Kubernetes APIs rather than filesystem-level operations.
