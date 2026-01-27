# How to Configure OpenShift Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, Kubernetes, Routes, TLS, Edge Termination, Passthrough, Reencrypt, Ingress, DevOps

Description: A practical guide to configuring OpenShift Routes for exposing applications with different TLS termination strategies, custom domains, and production-ready settings.

---

> Routes are the OpenShift-native way to expose services externally. Unlike vanilla Kubernetes Ingress, Routes provide built-in TLS termination options, custom domain support, and tight HAProxy integration out of the box.

## Understanding OpenShift Routes

OpenShift Routes extend the concept of Kubernetes Ingress with additional features specific to the OpenShift platform. A Route exposes a Service at a host name so that external clients can reach it by name.

```mermaid
flowchart LR
    Client[External Client] --> Router[OpenShift Router/HAProxy]
    Router --> Route[Route]
    Route --> Service[Service]
    Service --> Pod1[Pod]
    Service --> Pod2[Pod]
```

### Routes vs Ingress

While OpenShift supports Kubernetes Ingress resources, Routes offer additional capabilities:

- **TLS termination options** - Edge, passthrough, and re-encrypt
- **Sticky sessions** - Built-in session affinity support
- **Rate limiting** - HAProxy-based traffic control
- **Blue-green deployments** - Traffic splitting between services

## Route Types and TLS Termination

OpenShift supports three TLS termination strategies, each serving different security and performance requirements.

### Edge Termination

Edge termination decrypts TLS at the router level. The router handles certificates and forwards unencrypted traffic to your pods.

```yaml
# edge-route.yaml
# Edge termination - TLS ends at the router
# Traffic between router and pod is unencrypted (HTTP)
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: my-app-edge
  namespace: production
  labels:
    app: my-app
spec:
  # The hostname for external access
  host: my-app.example.com

  # Reference to the backend Service
  to:
    kind: Service
    name: my-app-service
    weight: 100

  # Target port on the Service
  port:
    targetPort: 8080

  # TLS configuration for edge termination
  tls:
    # Edge means TLS terminates at the router
    termination: edge

    # Redirect HTTP to HTTPS automatically
    insecureEdgeTerminationPolicy: Redirect

    # Optional: Use a specific certificate
    # If omitted, the router's default wildcard cert is used
    certificate: |
      -----BEGIN CERTIFICATE-----
      <your-certificate-here>
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      <your-private-key-here>
      -----END PRIVATE KEY-----
```

**When to use Edge termination:**
- Your application does not handle TLS internally
- You want centralized certificate management
- Performance is a priority (TLS overhead handled by router)

### Passthrough Termination

Passthrough routes send encrypted traffic directly to your pods. Your application must handle TLS termination.

```yaml
# passthrough-route.yaml
# Passthrough termination - TLS goes directly to the pod
# The router does not decrypt traffic; your app handles TLS
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: my-app-passthrough
  namespace: production
  labels:
    app: my-app
spec:
  host: secure-app.example.com

  to:
    kind: Service
    name: my-secure-app
    weight: 100

  # For passthrough, the port must match your TLS-enabled service port
  port:
    targetPort: 8443

  tls:
    # Passthrough means the router forwards encrypted traffic as-is
    termination: passthrough

    # Passthrough does not support Redirect since router cannot inspect traffic
    # Use None or empty to allow only HTTPS
    insecureEdgeTerminationPolicy: None
```

**When to use Passthrough termination:**
- End-to-end encryption is required (compliance, security)
- Your application requires client certificates (mTLS)
- You need to handle TLS at the application level

### Re-encrypt Termination

Re-encrypt terminates TLS at the router and creates a new TLS connection to the backend. This provides security at both hops.

```yaml
# reencrypt-route.yaml
# Re-encrypt termination - TLS at router AND to pod
# Router decrypts, then re-encrypts to backend
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: my-app-reencrypt
  namespace: production
  labels:
    app: my-app
spec:
  host: secure-internal.example.com

  to:
    kind: Service
    name: my-secure-backend
    weight: 100

  port:
    # Target port must be TLS-enabled on the backend
    targetPort: 8443

  tls:
    # Re-encrypt: router terminates external TLS, creates new TLS to pod
    termination: reencrypt

    insecureEdgeTerminationPolicy: Redirect

    # Certificate for external clients
    certificate: |
      -----BEGIN CERTIFICATE-----
      <external-certificate>
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      <external-private-key>
      -----END PRIVATE KEY-----

    # CA certificate to verify the backend's certificate
    # This ensures the router only connects to trusted backends
    destinationCACertificate: |
      -----BEGIN CERTIFICATE-----
      <backend-ca-certificate>
      -----END CERTIFICATE-----
```

**When to use Re-encrypt termination:**
- You need encryption in transit within the cluster
- Compliance requires TLS between all components
- Defense in depth security model

## Custom Domains and Certificates

### Using Custom Domains

To use a custom domain, you need to configure DNS and provide appropriate certificates.

```yaml
# custom-domain-route.yaml
# Route with custom domain and Let's Encrypt certificate
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: custom-domain-app
  namespace: production
  annotations:
    # Optional: Set timeout for long-running connections
    haproxy.router.openshift.io/timeout: 60s
spec:
  # Your custom domain - ensure DNS points to OpenShift router
  host: api.mycompany.com

  to:
    kind: Service
    name: api-service
    weight: 100

  port:
    targetPort: http

  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect

    # Your domain's certificate (can be from Let's Encrypt, DigiCert, etc.)
    certificate: |
      -----BEGIN CERTIFICATE-----
      <your-domain-certificate>
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      <your-private-key>
      -----END PRIVATE KEY-----

    # Include intermediate CA certificates if needed
    caCertificate: |
      -----BEGIN CERTIFICATE-----
      <intermediate-ca-certificate>
      -----END CERTIFICATE-----
```

### Using Secrets for Certificates

For better security and easier rotation, store certificates in Secrets.

```yaml
# tls-secret.yaml
# Store TLS certificates in a Secret for easier management
apiVersion: v1
kind: Secret
metadata:
  name: my-app-tls
  namespace: production
type: kubernetes.io/tls
data:
  # Base64-encoded certificate and key
  tls.crt: <base64-encoded-certificate>
  tls.key: <base64-encoded-private-key>
---
# route-with-secret.yaml
# Reference the TLS secret in the Route
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: my-app-with-secret
  namespace: production
  annotations:
    # Tell the router to use the secret for TLS
    cert-utils-operator.redhat-cop.io/certs-from-secret: my-app-tls
spec:
  host: app.example.com
  to:
    kind: Service
    name: my-app
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

## Route Annotations

Annotations customize router behavior for individual routes.

### Common HAProxy Annotations

```yaml
# annotated-route.yaml
# Route with production-ready HAProxy annotations
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: production-app
  namespace: production
  annotations:
    # Connection timeout (default: 30s)
    # Increase for long-running requests like file uploads
    haproxy.router.openshift.io/timeout: 120s

    # Enable sticky sessions using cookies
    # Ensures user sessions go to the same pod
    haproxy.router.openshift.io/balance: roundrobin
    haproxy.router.openshift.io/disable_cookies: "false"

    # Rate limiting - requests per second per IP
    haproxy.router.openshift.io/rate-limit-connections: "true"
    haproxy.router.openshift.io/rate-limit-connections.concurrent-tcp: "100"
    haproxy.router.openshift.io/rate-limit-connections.rate-tcp: "100"
    haproxy.router.openshift.io/rate-limit-connections.rate-http: "100"

    # IP whitelisting - only allow specific source IPs
    haproxy.router.openshift.io/ip_whitelist: "10.0.0.0/8 192.168.1.0/24"

    # Custom HAProxy configuration snippet
    haproxy.router.openshift.io/hsts_header: "max-age=31536000;includeSubDomains;preload"

    # Rewrite target path
    haproxy.router.openshift.io/rewrite-target: /api/v2
spec:
  host: api.example.com
  to:
    kind: Service
    name: api-service
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

### Session Affinity Configuration

```yaml
# sticky-session-route.yaml
# Route with cookie-based session affinity
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: stateful-app
  namespace: production
  annotations:
    # Enable cookie-based session affinity
    haproxy.router.openshift.io/balance: roundrobin

    # Cookie name for session tracking
    router.openshift.io/cookie_name: "SESSIONID"

    # Cookie settings
    router.openshift.io/cookie-same-site: "Strict"
spec:
  host: app.example.com
  to:
    kind: Service
    name: stateful-service
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

## Traffic Splitting and Blue-Green Deployments

Routes support traffic splitting between multiple services for canary deployments.

```yaml
# blue-green-route.yaml
# Route with traffic split between blue and green deployments
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: my-app-bluegreen
  namespace: production
  annotations:
    # Ensure even distribution based on weights
    haproxy.router.openshift.io/balance: roundrobin
spec:
  host: app.example.com

  # Primary backend (blue) - receives 90% of traffic
  to:
    kind: Service
    name: my-app-blue
    weight: 90

  # Alternate backends for traffic splitting
  alternateBackends:
    # Green deployment - receives 10% of traffic (canary)
    - kind: Service
      name: my-app-green
      weight: 10

  port:
    targetPort: 8080

  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

## Wildcard Routes

Wildcard routes handle multiple subdomains with a single route.

```yaml
# wildcard-route.yaml
# Wildcard route for multi-tenant applications
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: wildcard-app
  namespace: production
spec:
  # Wildcard subdomain - matches *.apps.example.com
  host: "*.apps.example.com"

  # Wildcard policy must be set for subdomain matching
  wildcardPolicy: Subdomain

  to:
    kind: Service
    name: multi-tenant-app

  port:
    targetPort: 8080

  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
    # Use a wildcard certificate
    certificate: |
      -----BEGIN CERTIFICATE-----
      <wildcard-certificate-for-*.apps.example.com>
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      <wildcard-private-key>
      -----END PRIVATE KEY-----
```

## Monitoring Routes

### Check Route Status

```bash
# List all routes in a namespace
oc get routes -n production

# Describe a specific route for detailed information
oc describe route my-app -n production

# Check route admission status
oc get route my-app -n production -o jsonpath='{.status.ingress[*].conditions}'

# Get the router's admitted host
oc get route my-app -n production -o jsonpath='{.status.ingress[0].host}'
```

### Debug Route Issues

```bash
# Check router pods are running
oc get pods -n openshift-ingress

# View router logs for troubleshooting
oc logs -n openshift-ingress deployment/router-default

# Test route connectivity
curl -v https://my-app.example.com

# Check if route is properly admitted
oc get route my-app -o yaml | grep -A5 "status:"
```

## Best Practices Summary

1. **Always use TLS** - Never expose HTTP-only routes in production. Use `insecureEdgeTerminationPolicy: Redirect` to force HTTPS.

2. **Choose the right termination** - Use edge for simplicity, passthrough for mTLS requirements, and re-encrypt for defense in depth.

3. **Set appropriate timeouts** - Configure `haproxy.router.openshift.io/timeout` based on your application's needs to prevent premature connection drops.

4. **Use secrets for certificates** - Store TLS certificates in Kubernetes Secrets rather than inline in Route manifests for easier rotation and better security.

5. **Implement rate limiting** - Protect your services from abuse with HAProxy rate limiting annotations.

6. **Enable HSTS** - Add the `hsts_header` annotation to enforce HTTPS in browsers and prevent downgrade attacks.

7. **Monitor route health** - Regularly check route admission status and router logs to catch configuration issues early.

8. **Use meaningful names** - Name routes clearly to indicate their purpose, environment, and termination type.

9. **Document annotations** - Comment your route annotations to explain why specific settings were chosen.

10. **Test failover scenarios** - Verify that traffic splitting and blue-green deployments work as expected before production rollouts.

---

Properly configured routes are essential for secure, reliable application exposure in OpenShift. Start with edge termination for simplicity, add appropriate annotations for your use case, and always test your TLS configuration before going live.

Monitor your routes and application traffic with [OneUptime](https://oneuptime.com) to ensure your services remain accessible and performant.
