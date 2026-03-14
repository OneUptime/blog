# How to Handle Legacy Applications That Don't Support mTLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Legacy Applications, Kubernetes, Security

Description: Strategies for integrating legacy applications that cannot support mutual TLS into an Istio service mesh without compromising security.

---

Not every application in your cluster plays nicely with Istio's mTLS. Maybe you have a legacy service that was written a decade ago and cannot handle TLS termination properly. Maybe it is a third-party binary you cannot modify. Or maybe it is a database client that chokes when the connection goes through an Envoy proxy. Whatever the situation, you need strategies to integrate these applications into your mesh without breaking them.

Here are the practical approaches that actually work.

## Understanding Why Some Apps Break with mTLS

When Istio enables mTLS, the Envoy sidecar handles all TLS negotiation transparently. The application itself does not need to know about mTLS because the sidecar handles it. So why do some apps still break?

Common reasons:

1. **The app does its own TLS** - if an application already terminates TLS, having the sidecar also do TLS creates a double encryption problem
2. **The app uses a protocol Envoy cannot parse** - custom binary protocols or server-first protocols
3. **The app bypasses the sidecar** - using host networking, connecting to IPs directly, or using non-standard ports
4. **The init container cannot set up iptables** - some security contexts prevent the istio-init container from modifying network rules
5. **The app cannot handle sidecar startup delays** - the application tries to connect before the sidecar is ready

## Strategy 1: Exclude the Application from the Mesh

The simplest approach is to keep the legacy app outside the mesh entirely:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: legacy-app
        image: legacy-app:v2.3
```

But if the rest of your mesh uses strict mTLS, other services cannot communicate with this app. You need to configure a PeerAuthentication policy that allows plaintext traffic to this workload:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-app-permissive
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-app
  mtls:
    mode: DISABLE
```

And a DestinationRule so that meshed clients know to use plaintext when talking to this service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: legacy-app-dr
  namespace: default
spec:
  host: legacy-app.default.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

## Strategy 2: Keep Sidecar But Exclude Specific Ports

If the application works fine with the sidecar for most traffic but has a specific port that is problematic, exclude that port:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "3306,6379"
        traffic.sidecar.istio.io/excludeOutboundPorts: "3306,6379"
    spec:
      containers:
      - name: legacy-app
        image: legacy-app:v2.3
        ports:
        - containerPort: 8080
        - containerPort: 3306
```

In this example, port 8080 goes through the sidecar with mTLS, while ports 3306 and 6379 bypass the sidecar entirely. This is useful for applications that have both HTTP endpoints (which work fine with Istio) and database connections (which might not).

## Strategy 3: Use Permissive Mode Per Service

If the legacy app has a sidecar but cannot handle strict mTLS on certain ports:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-app-mixed
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-app
  mtls:
    mode: STRICT
  portLevelMtls:
    3306:
      mode: PERMISSIVE
    8080:
      mode: STRICT
```

This keeps mTLS strict on the main HTTP port but allows both plaintext and mTLS on port 3306.

## Strategy 4: Put a Proxy Sidecar Without mTLS

You might want the observability benefits of the sidecar (metrics, tracing, access logs) without the mTLS enforcement. You can do this by injecting the sidecar but disabling mTLS for that specific workload:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-no-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-app
  mtls:
    mode: DISABLE
```

The sidecar still proxies all traffic and collects telemetry, but it does not enforce or negotiate TLS. Other services in the mesh can still reach this app - they just will not get mTLS for this specific connection.

## Strategy 5: Use a Gateway for Legacy-to-Mesh Communication

If your legacy application lives outside the mesh (maybe even outside the cluster) and needs to call meshed services, use an Istio ingress gateway as a bridge:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: legacy-bridge
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 8443
      name: https
      protocol: HTTPS
    hosts:
    - "internal-api.example.com"
    tls:
      mode: SIMPLE
      credentialName: internal-api-cert
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: legacy-bridge-route
  namespace: default
spec:
  hosts:
  - "internal-api.example.com"
  gateways:
  - istio-system/legacy-bridge
  http:
  - route:
    - destination:
        host: payment-service
        port:
          number: 8080
```

The legacy app connects to the gateway using standard TLS (not mTLS). The gateway then forwards the request to the meshed service using mTLS. This gives you an encrypted path from the legacy app to the mesh without requiring the legacy app to participate in the mTLS handshake.

## Strategy 6: Sidecar with Interception Mode NONE

For applications that have issues with iptables-based traffic interception, you can use the NONE interception mode. In this mode, the sidecar is deployed but does not intercept traffic automatically. The application must be configured to use the sidecar as an explicit proxy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/interceptionMode: NONE
    spec:
      containers:
      - name: legacy-app
        image: legacy-app:v2.3
        env:
        - name: HTTP_PROXY
          value: "http://127.0.0.1:15001"
        - name: HTTPS_PROXY
          value: "http://127.0.0.1:15001"
```

This only works if the application respects HTTP_PROXY environment variables.

## Handling External Databases

A very common scenario is legacy applications that connect to external databases (RDS, Cloud SQL, etc.) over TLS. The database connection goes through the sidecar, which tries to intercept it.

The cleanest solution is to exclude the database port:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432,3306,27017"
```

Or exclude the database IP range:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8"
```

## Security Considerations

Every time you create an exception for a legacy app, you are creating a hole in your mesh's security posture. Document each exception and include:

- Why the exception is needed
- Which specific ports or services are affected
- Who is responsible for eventually fixing the underlying issue
- A target date for removing the exception

Create a tracking document or use Kubernetes annotations:

```yaml
metadata:
  annotations:
    security.example.com/mtls-exception: "true"
    security.example.com/exception-reason: "Legacy protocol incompatible with TLS interception"
    security.example.com/exception-owner: "platform-team"
    security.example.com/exception-review-date: "2026-06-01"
```

## Testing Legacy App Compatibility

Before deploying to production, test each legacy app in a staging environment:

```bash
# Deploy with sidecar
kubectl apply -f legacy-app.yaml

# Check if the app is healthy
kubectl get pods -l app=legacy-app
kubectl logs -l app=legacy-app -c legacy-app

# Check sidecar logs for errors
kubectl logs -l app=legacy-app -c istio-proxy | grep -E "error|warning|refused"

# Test connectivity from a meshed service
kubectl exec -it meshed-client -- curl http://legacy-app:8080/health

# Test connectivity from the legacy app to meshed services
kubectl exec -it legacy-app-pod -- curl http://meshed-service:8080/health
```

If any of these tests fail, start applying the strategies above one at a time until you find the right configuration. It is usually faster to start with the least invasive option (port exclusion) and only fall back to removing the sidecar entirely if nothing else works.
