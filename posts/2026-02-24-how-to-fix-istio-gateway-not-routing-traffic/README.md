# How to Fix Istio Gateway Not Routing Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, Routing, Troubleshooting, Ingress

Description: Diagnose and fix Istio ingress gateway routing failures including misconfigured Gateways, VirtualService binding issues, and TLS termination problems.

---

The Istio ingress gateway is the front door to your mesh. When it stops routing traffic, nothing from outside can reach your services. You might see 404s, 503s, connection resets, or just timeouts. The frustrating part is that traffic within the mesh works fine - it is only external traffic through the gateway that fails.

This guide covers every common reason an Istio gateway stops routing traffic and how to fix each one.

## Verify the Gateway Deployment is Running

Start with the basics. The ingress gateway is a regular Kubernetes deployment:

```bash
# Check the gateway pods
kubectl get pods -n istio-system -l app=istio-ingressgateway

# Check the gateway service
kubectl get svc istio-ingressgateway -n istio-system

# Check if the gateway has an external IP
kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0]}'
```

If the service shows `<pending>` for the external IP, the cloud load balancer has not been provisioned. Check your cloud provider's load balancer settings.

If the pods are not running:

```bash
kubectl describe pods -n istio-system -l app=istio-ingressgateway
kubectl logs -n istio-system -l app=istio-ingressgateway
```

## Check Gateway Resource Configuration

The Gateway resource tells the ingress gateway what ports and hosts to listen on:

```bash
# List all Gateway resources
kubectl get gateways --all-namespaces

# Check the gateway details
kubectl get gateway main-gateway -n istio-system -o yaml
```

Make sure the selector matches the gateway deployment labels:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway  # Must match the gateway pod labels
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
```

Verify the selector matches:

```bash
# Check the gateway pod labels
kubectl get pods -n istio-system -l app=istio-ingressgateway --show-labels

# The "istio: ingressgateway" label should be present
```

If the selector does not match any pods, the Gateway resource is orphaned and does nothing.

## Check VirtualService Binding

The VirtualService must reference the correct Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-routes
  namespace: production
spec:
  hosts:
    - myapp.example.com
  gateways:
    - istio-system/main-gateway  # namespace/name format
  http:
    - route:
        - destination:
            host: my-service
            port:
              number: 8080
```

Common mistakes:

**Wrong gateway reference:**

```yaml
# Wrong: Missing namespace
gateways:
  - main-gateway

# Correct: Full namespace/name
gateways:
  - istio-system/main-gateway
```

**Host not matching between Gateway and VirtualService:**

```yaml
# Gateway allows: "api.example.com"
# VirtualService claims: "app.example.com"
# Result: No match, traffic gets 404
```

The VirtualService host must be a subset of what the Gateway allows. If the Gateway has `*.example.com`, then `myapp.example.com` works. If the Gateway only lists `api.example.com`, then `myapp.example.com` will not match.

## Verify Gateway Listeners

Check what the gateway proxy is actually listening on:

```bash
# Get the gateway pod name
GATEWAY_POD=$(kubectl get pods -n istio-system -l app=istio-ingressgateway -o jsonpath='{.items[0].metadata.name}')

# Check listeners
istioctl proxy-config listeners $GATEWAY_POD -n istio-system

# Check routes
istioctl proxy-config routes $GATEWAY_POD -n istio-system
```

If the routes are empty, the VirtualService is not binding to the Gateway correctly. If the listeners do not show your expected port, the Gateway resource is not being applied.

For detailed route inspection:

```bash
# Check what routes exist for a specific host
istioctl proxy-config routes $GATEWAY_POD -n istio-system -o json | \
  jq '.[].virtualHosts[] | select(.domains[] | contains("myapp.example.com"))'
```

If your domain does not appear, the configuration chain is broken.

## TLS Configuration Issues

TLS problems are a common cause of gateway routing failures:

**Certificate not found:**

```bash
# Check if the TLS secret exists
kubectl get secret my-tls-cert -n istio-system

# Verify the secret has the right keys
kubectl get secret my-tls-cert -n istio-system -o jsonpath='{.data}' | jq 'keys'
```

The secret must contain `tls.crt` and `tls.key`:

```bash
# Create a proper TLS secret
kubectl create secret tls my-tls-cert \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

**Wrong namespace for the secret:** The TLS secret must be in the same namespace as the gateway deployment (usually `istio-system`). If the secret is in a different namespace, the gateway cannot access it.

**Expired certificate:**

```bash
kubectl get secret my-tls-cert -n istio-system -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -dates
```

If the certificate is expired, external clients will refuse to connect. Renew and update the secret:

```bash
kubectl create secret tls my-tls-cert \
  --cert=new-fullchain.pem \
  --key=new-privkey.pem \
  -n istio-system \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Port and Protocol Mismatches

The gateway service must expose the correct ports:

```bash
# Check what ports the gateway service exposes
kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.spec.ports[*]}' | jq .
```

The Gateway resource ports must match ports available on the service:

```yaml
# Gateway says port 443
servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS

# The service must also expose port 443
# kubectl get svc istio-ingressgateway shows port 443/TCP
```

If you need to add ports to the gateway service:

```bash
kubectl patch svc istio-ingressgateway -n istio-system --type merge -p '
spec:
  ports:
  - name: custom-port
    port: 8443
    targetPort: 8443
    protocol: TCP'
```

## Backend Service Unreachable

The gateway routes traffic to backend services. If those services are unreachable from the gateway:

```bash
# Test connectivity from the gateway pod
kubectl exec $GATEWAY_POD -n istio-system -- curl -v http://my-service.production.svc.cluster.local:8080/health

# Check if the gateway can resolve the service
kubectl exec $GATEWAY_POD -n istio-system -- nslookup my-service.production.svc.cluster.local
```

If the gateway cannot reach the backend, check:

1. The service exists and has endpoints
2. Network policies allow traffic from istio-system to the target namespace
3. The destination host in the VirtualService uses the correct format

```yaml
# Use fully qualified service name
destination:
  host: my-service.production.svc.cluster.local
  port:
    number: 8080
```

## Gateway Logs

Check the gateway proxy access logs for details about failed requests:

```bash
# Check gateway access logs
kubectl logs $GATEWAY_POD -n istio-system --tail=50

# Filter for error responses
kubectl logs $GATEWAY_POD -n istio-system | grep " 404 \| 503 \| 502 "
```

Response flags in the access logs tell you what went wrong:

- `NR` (No route): The request did not match any VirtualService route
- `UF` (Upstream failure): Could not connect to the backend
- `UH` (Upstream unhealthy): No healthy endpoints
- `DC` (Downstream connection termination): Client disconnected

## Multiple Gateways Conflict

If you have multiple Gateway resources, they might conflict:

```bash
# List all gateways
kubectl get gateways --all-namespaces
```

If two Gateway resources bind to the same port with overlapping hosts, behavior is undefined:

```bash
# Check for conflicts
istioctl analyze --all-namespaces 2>&1 | grep -i gateway
```

Consolidate overlapping Gateways into a single resource, or use more specific host patterns.

## Testing End-to-End

Run a complete test to verify the routing chain:

```bash
# Get the gateway external IP
GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test HTTP
curl -v -H "Host: myapp.example.com" http://$GATEWAY_IP/health

# Test HTTPS
curl -v -H "Host: myapp.example.com" https://$GATEWAY_IP/health --resolve myapp.example.com:443:$GATEWAY_IP

# Test with specific path
curl -v -H "Host: myapp.example.com" http://$GATEWAY_IP/api/v1/orders
```

Use the `Host` header to test before DNS is configured.

## Diagnostic Checklist

```bash
# 1. Gateway pods running?
kubectl get pods -n istio-system -l app=istio-ingressgateway

# 2. External IP assigned?
kubectl get svc istio-ingressgateway -n istio-system

# 3. Gateway resource applied?
kubectl get gateways --all-namespaces

# 4. VirtualService bound to gateway?
kubectl get virtualservices --all-namespaces -o yaml | grep gateways -A 2

# 5. Listeners configured?
istioctl proxy-config listeners $GATEWAY_POD -n istio-system

# 6. Routes configured?
istioctl proxy-config routes $GATEWAY_POD -n istio-system

# 7. Backend reachable?
istioctl proxy-config endpoints $GATEWAY_POD -n istio-system | grep my-service

# 8. TLS secret valid?
kubectl get secret -n istio-system

# 9. Run analyzer
istioctl analyze --all-namespaces
```

Gateway routing issues almost always come down to one of three things: the VirtualService is not properly bound to the Gateway, the TLS configuration is wrong, or the backend service is unreachable. Work through the checklist systematically and check the gateway access logs for specific error codes and response flags to pinpoint the exact cause.
