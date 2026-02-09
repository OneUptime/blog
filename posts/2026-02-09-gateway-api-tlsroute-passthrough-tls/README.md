# How to Set Up Kubernetes Gateway API TLSRoute for Passthrough TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, TLS

Description: Configure TLSRoute resources in the Kubernetes Gateway API to implement TLS passthrough routing, allowing encrypted traffic to flow directly to backend services without termination at the gateway for end-to-end encryption.

---

TLS passthrough allows encrypted traffic to flow through a gateway directly to backend services without decryption at the gateway layer. This maintains end-to-end encryption and keeps private keys within backend services rather than centralizing them at the gateway. The Kubernetes Gateway API TLSRoute resource enables SNI-based routing for passthrough TLS traffic.

## Understanding TLS Passthrough vs Termination

TLS termination decrypts traffic at the gateway, inspects or modifies it, then re-encrypts before sending to backends. This requires the gateway to hold TLS certificates and private keys.

TLS passthrough reads only the Server Name Indication (SNI) field from the TLS ClientHello message to determine routing, then forwards the encrypted stream unchanged to the backend. The backend service performs TLS termination.

Benefits of passthrough:
- End-to-end encryption without exposing private keys to the gateway
- Backend services control their own certificates
- No CPU overhead for decrypt/re-encrypt at the gateway
- Simplified certificate management

Drawbacks:
- Cannot inspect or modify Layer 7 data
- Cannot perform header-based routing
- Each backend needs its own certificate

## Setting Up a Passthrough Gateway

Create a Gateway with a TLS listener in Passthrough mode:

```yaml
# passthrough-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tls-passthrough-gateway
  namespace: default
spec:
  gatewayClassName: kong
  listeners:
  - name: tls-passthrough
    protocol: TLS
    port: 443
    tls:
      mode: Passthrough  # Key setting for passthrough
    allowedRoutes:
      namespaces:
        from: All
      kinds:
      - kind: TLSRoute
```

Apply the gateway:

```bash
kubectl apply -f passthrough-gateway.yaml

# Wait for it to be ready
kubectl wait --for=condition=Programmed gateway/tls-passthrough-gateway --timeout=300s
```

## Creating a Basic TLSRoute

Configure TLSRoute to route based on SNI hostnames:

```yaml
# basic-tlsroute.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: api-tls-route
  namespace: default
spec:
  parentRefs:
  - name: tls-passthrough-gateway
  hostnames:
  - "api.example.com"
  rules:
  - backendRefs:
    - name: api-service
      port: 8443
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api-server
  ports:
  - name: https
    protocol: TCP
    port: 8443
    targetPort: 8443
```

The backend service must handle TLS itself. Deploy a backend with TLS:

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
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
        - containerPort: 8443
          name: https
        volumeMounts:
        - name: tls-certs
          mountPath: /etc/nginx/ssl
          readOnly: true
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
      volumes:
      - name: tls-certs
        secret:
          secretName: api-tls-cert
      - name: nginx-config
        configMap:
          name: nginx-tls-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-tls-config
data:
  nginx.conf: |
    events {}
    http {
      server {
        listen 8443 ssl;
        server_name api.example.com;

        ssl_certificate /etc/nginx/ssl/tls.crt;
        ssl_certificate_key /etc/nginx/ssl/tls.key;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
          return 200 'Hello from API service\n';
          add_header Content-Type text/plain;
        }
      }
    }
```

Create a self-signed certificate for testing:

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=api.example.com/O=Example Inc"

# Create Kubernetes secret
kubectl create secret tls api-tls-cert --cert=tls.crt --key=tls.key
```

Apply all manifests:

```bash
kubectl apply -f basic-tlsroute.yaml
kubectl apply -f api-deployment.yaml
```

Test the connection:

```bash
# Get gateway IP
GATEWAY_IP=$(kubectl get gateway tls-passthrough-gateway -o jsonpath='{.status.addresses[0].value}')

# Test with curl (use --insecure for self-signed certs)
curl --insecure --resolve api.example.com:443:$GATEWAY_IP https://api.example.com
```

## Routing Multiple Services by SNI

Route different SNI hostnames to different backend services:

```yaml
# multi-service-tlsroute.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: multi-service-tls
spec:
  parentRefs:
  - name: tls-passthrough-gateway
  hostnames:
  - "api.example.com"
  rules:
  - backendRefs:
    - name: api-service
      port: 8443
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: admin-tls
spec:
  parentRefs:
  - name: tls-passthrough-gateway
  hostnames:
  - "admin.example.com"
  rules:
  - backendRefs:
    - name: admin-service
      port: 8443
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: metrics-tls
spec:
  parentRefs:
  - name: tls-passthrough-gateway
  hostnames:
  - "metrics.example.com"
  rules:
  - backendRefs:
    - name: metrics-service
      port: 9443
```

Each service gets routed based on the SNI hostname in the TLS ClientHello.

## Wildcard Hostname Matching

Use wildcard patterns for subdomains:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: wildcard-tls
spec:
  parentRefs:
  - name: tls-passthrough-gateway
  hostnames:
  - "*.apps.example.com"
  rules:
  - backendRefs:
    - name: app-router-service
      port: 8443
```

This routes `app1.apps.example.com`, `app2.apps.example.com`, etc. to the app-router-service, which can perform further routing.

## Cross-Namespace Routing with ReferenceGrant

Route to services in different namespaces:

```yaml
# tlsroute-cross-namespace.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: backend-tls
  namespace: default
spec:
  parentRefs:
  - name: tls-passthrough-gateway
    namespace: default
  hostnames:
  - "backend.example.com"
  rules:
  - backendRefs:
    - name: backend-service
      namespace: backend-namespace
      port: 8443
---
# Allow cross-namespace reference
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-default-to-backend
  namespace: backend-namespace
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: TLSRoute
    namespace: default
  to:
  - group: ""
    kind: Service
```

## Backend Traffic Splitting

Split TLS traffic between multiple backend versions:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: canary-tls
spec:
  parentRefs:
  - name: tls-passthrough-gateway
  hostnames:
  - "api.example.com"
  rules:
  - backendRefs:
    - name: api-stable
      port: 8443
      weight: 90
    - name: api-canary
      port: 8443
      weight: 10
```

Note that with TLS passthrough, you cannot use header-based or cookie-based canary routing since the gateway doesn't decrypt traffic. Traffic splitting is purely random based on weights.

## Monitoring TLS Passthrough

Check TLSRoute status:

```bash
kubectl describe tlsroute api-tls-route
```

Look for the status conditions:

```yaml
status:
  parents:
  - parentRef:
      name: tls-passthrough-gateway
    conditions:
    - type: Accepted
      status: "True"
      reason: Accepted
    - type: ResolvedRefs
      status: "True"
      reason: ResolvedRefs
```

Monitor connection metrics at the backend since the gateway doesn't decrypt:

```bash
# Check backend service logs
kubectl logs -l app=api-server --tail=100 -f
```

Use tcpdump to verify encrypted traffic flows through without decryption:

```bash
# On a gateway pod
kubectl exec -it <gateway-pod> -- tcpdump -i any -n port 443 -X | head -50
```

You should see encrypted TLS data, not plain HTTP.

## Combining Passthrough and Termination

A single Gateway can handle both passthrough and termination:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: mixed-mode-gateway
spec:
  gatewayClassName: kong
  listeners:
  # Listener for TLS passthrough
  - name: tls-passthrough
    protocol: TLS
    port: 8443
    tls:
      mode: Passthrough
    allowedRoutes:
      kinds:
      - kind: TLSRoute
  # Listener for TLS termination (HTTPRoute)
  - name: https-terminate
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: gateway-tls-cert
    allowedRoutes:
      kinds:
      - kind: HTTPRoute
```

HTTPRoutes attach to the termination listener on port 443, while TLSRoutes attach to the passthrough listener on port 8443.

## Certificate Management for Backends

Backend services need valid certificates. Use cert-manager to automate certificate provisioning:

```yaml
# certificate-for-backend.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-cert
  namespace: default
spec:
  secretName: api-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
  - www.api.example.com
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

Cert-manager automatically renews certificates before expiration.

## Troubleshooting TLS Passthrough

Common issues and solutions:

**SNI mismatch**: Verify the SNI sent by the client matches the TLSRoute hostname:

```bash
# Check SNI with openssl
openssl s_client -connect $GATEWAY_IP:443 -servername api.example.com < /dev/null 2>&1 | grep "Server certificate"
```

**Backend certificate issues**: Ensure backend services present valid certificates for their hostnames:

```bash
# Test backend directly
kubectl port-forward svc/api-service 8443:8443
openssl s_client -connect localhost:8443 -servername api.example.com
```

**No route match**: Check TLSRoute status for resolution errors:

```bash
kubectl get tlsroute -o yaml | grep -A 10 status
```

## Security Considerations

TLS passthrough provides strong end-to-end encryption but has implications:

1. **No Layer 7 security**: The gateway cannot inspect traffic for threats or apply WAF rules
2. **Certificate sprawl**: Each backend needs its own certificate
3. **No centralized logging**: Cannot log HTTP headers or URLs at the gateway
4. **Limited observability**: Cannot collect Layer 7 metrics at the gateway

For services requiring inspection, use TLS termination instead. For sensitive services where certificate control is critical, passthrough is the right choice.

## Performance Characteristics

TLS passthrough has minimal overhead:
- No CPU cost for encryption/decryption
- Simple SNI parsing and forwarding
- Lower latency than termination and re-encryption

Benchmark the difference:

```bash
# Test passthrough latency
hey -z 30s -c 100 https://api.example.com

# Compare to termination latency
hey -z 30s -c 100 https://terminated-api.example.com
```

Passthrough typically shows 10-30% better latency and throughput.

TLSRoute with passthrough mode provides secure, performant routing for services that need end-to-end encryption. Use it when backends must control their own certificates, when Layer 7 inspection isn't required, or when you need the lowest possible latency. Combine passthrough and termination listeners on a single Gateway to handle different security requirements for different services.
