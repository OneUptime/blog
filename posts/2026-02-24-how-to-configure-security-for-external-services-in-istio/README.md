# How to Configure Security for External Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, External Services, Security, TLS Origination, ServiceEntry, Kubernetes

Description: How to securely connect to external services from your Istio mesh using ServiceEntries, TLS origination, egress gateways, and access controls.

---

Your applications don't live in isolation. They call third-party APIs, cloud services, databases, and SaaS platforms. Each of these external connections is a potential security risk. Without proper controls, any compromised pod can reach any external endpoint, and your traffic to external services might not be encrypted.

Istio gives you tools to control, encrypt, and monitor connections to external services. The key resources are ServiceEntry (to register external services), DestinationRule (to configure TLS), and AuthorizationPolicy (to restrict who can call what).

## Locking Down External Access

The first step is switching from the default `ALLOW_ANY` outbound policy to `REGISTRY_ONLY`:

```yaml
meshConfig:
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
```

With `REGISTRY_ONLY`, services can only reach destinations that are registered in the mesh (Kubernetes services or ServiceEntries). All other outbound traffic is blocked.

Apply this change carefully. Audit all external dependencies first, or you'll break things. A good approach:

1. Keep `ALLOW_ANY` mode
2. Check Envoy access logs to identify all external destinations your services reach
3. Create ServiceEntries for each legitimate external dependency
4. Switch to `REGISTRY_ONLY`

## Registering External Services

Create a ServiceEntry for each external service:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: payments
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  exportTo:
    - "."
```

Important details:

- `location: MESH_EXTERNAL` tells Istio this service is outside the mesh. mTLS won't be applied to connections (the external service doesn't have an Istio sidecar).
- `resolution: DNS` means the sidecar resolves the hostname and connects to the resulting IP.
- `exportTo: ["."]` limits visibility to the current namespace. Only pods in the `payments` namespace can see this ServiceEntry.

## TLS Origination

If your application makes plain HTTP requests to an external API, you can have Istio upgrade the connection to HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.external.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-tls
  namespace: default
spec:
  host: api.external.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 80
        tls:
          mode: SIMPLE
          sni: api.external.com
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api-redirect
  namespace: default
spec:
  hosts:
    - api.external.com
  http:
    - match:
        - port: 80
      route:
        - destination:
            host: api.external.com
            port:
              number: 443
```

Your application calls `http://api.external.com:80`, and the sidecar:

1. Intercepts the HTTP request
2. Redirects it to port 443 (VirtualService)
3. Initiates a TLS connection to the external server (DestinationRule)
4. Forwards the request over the encrypted connection

This is useful for legacy applications that don't support HTTPS, or to centralize TLS certificate management.

## Mutual TLS to External Services

Some external services require client certificates. Configure the DestinationRule with mutual TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-mtls
  namespace: default
spec:
  host: api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/client-cert.pem
      privateKey: /etc/certs/client-key.pem
      caCertificates: /etc/certs/ca-cert.pem
      sni: api.partner.com
```

Mount the client certificates into the sidecar using a secret:

```bash
kubectl create secret generic partner-certs \
  --from-file=client-cert.pem \
  --from-file=client-key.pem \
  --from-file=ca-cert.pem \
  -n default
```

Then reference the secret in the pod annotation:

```yaml
annotations:
  sidecar.istio.io/userVolumeMount: '[{"name":"partner-certs","mountPath":"/etc/certs","readonly":true}]'
  sidecar.istio.io/userVolume: '[{"name":"partner-certs","secret":{"secretName":"partner-certs"}}]'
```

## Authorization Policies for External Access

Control which services can reach which external endpoints:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-stripe
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payment-processor
  action: ALLOW
  rules:
    - to:
        - operation:
            hosts:
              - api.stripe.com
            ports:
              - "443"
```

Wait, this doesn't quite work as expected. AuthorizationPolicy for outbound traffic is less common because it applies to the inbound side of the destination workload. For egress control, the better approach is:

1. Use namespace-scoped ServiceEntries with `exportTo`
2. Route through an egress gateway with authorization policies

```yaml
# Egress gateway authorization
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: egress-stripe
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/payments/sa/payment-processor
      to:
        - operation:
            ports:
              - "443"
```

## Securing Connections to Cloud Services

### AWS Services

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3
  namespace: default
spec:
  hosts:
    - "*.s3.amazonaws.com"
    - "*.s3.us-east-1.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: NONE
  exportTo:
    - "."
```

### Google Cloud Services

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-services
  namespace: default
spec:
  hosts:
    - "*.googleapis.com"
    - "accounts.google.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: NONE
  exportTo:
    - "."
```

### Azure Services

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: azure-services
  namespace: default
spec:
  hosts:
    - "*.azure.com"
    - "*.windows.net"
    - "*.microsoft.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: NONE
  exportTo:
    - "."
```

## Timeout and Retry Configuration

External services are inherently less reliable than internal services. Configure appropriate timeouts and retries:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api-policy
  namespace: default
spec:
  hosts:
    - api.external.com
  http:
    - route:
        - destination:
            host: api.external.com
            port:
              number: 443
      timeout: 10s
      retries:
        attempts: 2
        perTryTimeout: 4s
        retryOn: 5xx,reset,connect-failure
```

## Monitoring External Connections

Track connections to external services:

```bash
# Check which external services are being accessed
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET clusters | grep "MESH_EXTERNAL\|outbound"

# Check connection stats to a specific external service
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "api.external.com"
```

Enable access logging to see all outbound requests:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: outbound-logging
  namespace: default
spec:
  accessLogging:
    - providers:
        - name: envoy
      match:
        mode: CLIENT
```

The `mode: CLIENT` filter only logs outbound requests from this namespace's pods.

## Handling External Service Failures

Circuit breaking works for external services too:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-cb
  namespace: default
spec:
  host: api.external.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 20
        maxRequestsPerConnection: 5
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
```

This protects your services from cascading failures when an external dependency goes down.

Securing external service access in Istio means registering each dependency as a ServiceEntry, restricting which namespaces and service accounts can reach them, encrypting all connections with TLS, and monitoring the traffic patterns. Move to `REGISTRY_ONLY` mode, scope your ServiceEntries with `exportTo`, and use egress gateways for centralized control of the most sensitive external connections.
