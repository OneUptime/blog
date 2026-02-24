# How to Fix Istio Ingress Gateway Returning 503

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ingress Gateway, 503 Error, Kubernetes, Troubleshooting

Description: Troubleshooting guide for diagnosing and resolving 503 Service Unavailable errors from the Istio Ingress Gateway.

---

Getting a 503 from the Istio Ingress Gateway is frustrating because the error can come from several different layers. The gateway pod itself, the routing configuration, the backend service, or a mTLS mismatch could all be the culprit. Here's a systematic approach to finding and fixing the problem.

## Check the Gateway Pod Health

First, make sure the Ingress Gateway pod is actually running:

```bash
kubectl get pods -n istio-system -l app=istio-ingressgateway
```

If the pod is in CrashLoopBackOff or not ready, check its logs:

```bash
kubectl logs -l app=istio-ingressgateway -n istio-system
```

Also check that the Gateway service has an external IP:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

If the EXTERNAL-IP is `<pending>`, your load balancer isn't provisioned. This is a cloud provider issue, not an Istio issue.

## Verify the Gateway Resource

The Gateway resource defines which ports and hosts the Ingress Gateway listens on:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "myapp.example.com"
```

Check that:
1. The selector matches the Ingress Gateway pod labels
2. The host matches what you're requesting
3. The port and protocol are correct

Verify the selector matches:

```bash
kubectl get pod -n istio-system -l istio=ingressgateway --show-labels
```

## Check the VirtualService

The VirtualService routes traffic from the Gateway to your backend. This is where things go wrong most often.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: my-namespace
spec:
  hosts:
  - "myapp.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - route:
    - destination:
        host: my-service.my-namespace.svc.cluster.local
        port:
          number: 8080
```

Common mistakes:
- The `gateways` field doesn't reference the correct Gateway (include namespace if it's in a different one)
- The `hosts` field doesn't match the Gateway's hosts
- The destination host or port is wrong

## 503 with "No Healthy Upstream"

This means the gateway can see your service but none of the backend pods are considered healthy. Check if the backend pods are running:

```bash
kubectl get pods -n my-namespace -l app=my-service
```

Check the endpoints:

```bash
kubectl get endpoints my-service -n my-namespace
```

If endpoints are empty, the service selector doesn't match any pods.

Also check if the backend service port matches what the VirtualService references:

```bash
kubectl get svc my-service -n my-namespace -o yaml
```

## 503 with "Upstream Connect Error"

This typically means a mTLS mismatch. The gateway is trying to connect one way and the backend expects another.

If you have STRICT mTLS on the backend namespace but the DestinationRule for the gateway-to-backend connection has TLS disabled, you'll get connection failures.

Check PeerAuthentication:

```bash
kubectl get peerauthentication -n my-namespace
```

If it's STRICT, make sure there's no DestinationRule disabling TLS for that service:

```bash
kubectl get destinationrule -n my-namespace -o yaml
```

With auto mTLS (default), you typically don't need to set anything special. Remove any DestinationRule TLS settings and let Istio handle it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: my-namespace
spec:
  host: my-service.my-namespace.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
```

## 503 with "NR" (No Route)

If you see NR in the Envoy access logs, the gateway doesn't have a route configured for the request:

```bash
kubectl logs -l app=istio-ingressgateway -n istio-system | grep "NR"
```

This means either the VirtualService is misconfigured or it's not being applied. Use istioctl to check:

```bash
istioctl proxy-config routes -l app=istio-ingressgateway -n istio-system
```

Look for your route in the output. If it's not there, the VirtualService isn't being applied to the gateway.

## Check Envoy Configuration on the Gateway

The Ingress Gateway is just an Envoy proxy. You can inspect its configuration:

```bash
istioctl proxy-config listeners -l app=istio-ingressgateway -n istio-system
```

Check that there's a listener for your port. Then check routes:

```bash
istioctl proxy-config routes -l app=istio-ingressgateway -n istio-system -o json
```

And clusters (backends):

```bash
istioctl proxy-config clusters -l app=istio-ingressgateway -n istio-system
```

Look for your service in the clusters output. If it's not there, the gateway doesn't know about your backend.

## Service Port Naming

Istio requires service ports to be named with the protocol prefix. If the port isn't named correctly, Istio may not route traffic properly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: my-namespace
spec:
  ports:
  - name: http-web  # Must start with http, grpc, tcp, etc.
    port: 8080
    targetPort: 8080
```

If the port name is just `web` or `8080`, Istio treats it as plain TCP and may not apply HTTP routing rules.

## Gateway TLS Configuration

If you're using HTTPS on the gateway, the TLS certificate must be valid and present:

```yaml
apiVersion: networking.istio.io/v1beta1
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
    hosts:
    - "myapp.example.com"
    tls:
      mode: SIMPLE
      credentialName: myapp-tls-secret
```

The secret must be in the same namespace as the Ingress Gateway (usually `istio-system`):

```bash
kubectl get secret myapp-tls-secret -n istio-system
```

If the secret doesn't exist or has the wrong format, the gateway will fail to set up the TLS listener and return 503.

Create the secret if needed:

```bash
kubectl create secret tls myapp-tls-secret \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

## Connection Pool Exhaustion

If you're getting 503s intermittently, the connection pool might be full. Check DestinationRule settings:

```yaml
spec:
  host: my-service.my-namespace.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 1024
        http2MaxRequests: 1024
```

The defaults are quite conservative. Increase them if your service handles high traffic.

## Use istioctl analyze

As always, run the analyzer:

```bash
istioctl analyze -n my-namespace
istioctl analyze -n istio-system
```

It catches many common misconfigurations that lead to 503s.

## Summary

When the Istio Ingress Gateway returns 503, start by checking if the Gateway pod is healthy, then verify the Gateway and VirtualService configuration. Check that backend pods are running and have healthy endpoints. Look at Envoy access logs for response flags (NR, UH, UF) that tell you exactly what went wrong. Most 503s come from missing routes, mTLS mismatches, or backend services being down.
