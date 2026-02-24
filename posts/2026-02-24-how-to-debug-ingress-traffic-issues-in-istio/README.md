# How to Debug Ingress Traffic Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ingress, Debugging, Gateway, Traffic Management

Description: Complete troubleshooting guide for Istio ingress traffic issues covering Gateway configuration, VirtualService routing, TLS termination, and load balancer setup.

---

External traffic enters your Istio mesh through the ingress gateway. When something goes wrong at this layer, your users see errors and your services become unreachable from the outside. The ingress path has several components that all need to work together: the cloud load balancer, the Istio IngressGateway pod, the Gateway resource, and the VirtualService that routes traffic to your backend services.

Here is how to debug each part of that chain.

## The Ingress Traffic Flow

Understanding the flow helps you know where to look:

1. Client sends a request to the external IP or DNS name
2. Cloud load balancer forwards it to the IngressGateway Service (NodePort or LoadBalancer)
3. IngressGateway pod receives the request
4. The Gateway resource defines which hosts and ports to accept
5. A VirtualService routes the request to the correct backend service
6. The request reaches the backend pod

A failure at any stage means the client gets an error.

## Step 1: Check the Load Balancer

Make sure the IngressGateway Service has an external IP:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

Expected output:

```
NAME                   TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)
istio-ingressgateway   LoadBalancer   10.0.10.50     34.120.1.100   15021:30991/TCP,80:30080/TCP,443:30443/TCP
```

If EXTERNAL-IP shows `<pending>`, the cloud provider has not provisioned the load balancer yet. Check cloud-specific status:

```bash
# On GKE
kubectl describe svc istio-ingressgateway -n istio-system | grep -A 5 Events

# On AWS
kubectl describe svc istio-ingressgateway -n istio-system | grep "ingress"
```

Test connectivity to the external IP:

```bash
curl -v http://34.120.1.100 -H "Host: my-app.example.com"
```

## Step 2: Check the IngressGateway Pod

Make sure the ingress gateway pod is healthy:

```bash
kubectl get pod -n istio-system -l istio=ingressgateway
```

Check the pod logs for errors:

```bash
kubectl logs -n istio-system -l istio=ingressgateway --tail=100
```

Verify the pod is listening on the expected ports:

```bash
kubectl exec -n istio-system $(kubectl get pod -n istio-system -l istio=ingressgateway -o jsonpath='{.items[0].metadata.name}') -- ss -tlnp
```

## Step 3: Verify the Gateway Resource

The Gateway resource tells the ingress gateway which hosts and ports to accept. Check that it exists and is configured correctly:

```bash
kubectl get gateway --all-namespaces
```

Look at the Gateway definition:

```bash
kubectl get gateway my-gateway -n default -o yaml
```

Common Gateway misconfigurations:

### Wrong selector

The Gateway must select the correct ingress gateway pod:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
spec:
  selector:
    istio: ingressgateway  # Must match the pod labels
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "my-app.example.com"
```

Verify the selector matches:

```bash
kubectl get pod -n istio-system -l istio=ingressgateway --show-labels
```

### Host mismatch

The hosts in the Gateway must match the Host header in the incoming request. If your Gateway specifies `my-app.example.com` but clients send `www.my-app.example.com`, the request will not match.

### TLS configuration issues

For HTTPS, the Gateway needs a valid TLS secret:

```yaml
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: my-tls-secret
      hosts:
        - "my-app.example.com"
```

Check that the secret exists in the istio-system namespace:

```bash
kubectl get secret my-tls-secret -n istio-system
```

The secret must be in the same namespace as the ingress gateway pod (typically istio-system), not in the application namespace.

## Step 4: Check VirtualService Binding

The VirtualService must reference the Gateway and match the host:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "my-app.example.com"
  gateways:
    - my-gateway  # Or namespace/gateway-name if in a different namespace
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 8080
```

Common issues:

- The `gateways` field does not reference the correct Gateway
- The `hosts` field does not match the Gateway's hosts
- The destination host does not match a real Kubernetes service

Check if the ingress gateway has the route configured:

```bash
INGRESS_POD=$(kubectl get pod -n istio-system -l istio=ingressgateway -o jsonpath='{.items[0].metadata.name}')
istioctl proxy-config routes $INGRESS_POD.istio-system
```

You should see your host in the route table. If it is missing, the VirtualService is not binding correctly to the Gateway.

## Step 5: Check Envoy Listeners on the Gateway

```bash
istioctl proxy-config listeners $INGRESS_POD.istio-system
```

You should see listeners for port 80, 443, or whatever ports your Gateway defines. If the listener is missing, the Gateway resource is not being applied correctly.

For more detail:

```bash
istioctl proxy-config listeners $INGRESS_POD.istio-system --port 443 -o json
```

## Step 6: Test the Full Path

Send a request through the ingress and follow it:

```bash
# HTTP
curl -v http://EXTERNAL_IP -H "Host: my-app.example.com"

# HTTPS
curl -v https://my-app.example.com --resolve "my-app.example.com:443:EXTERNAL_IP"
```

Check the ingress gateway access logs:

```bash
kubectl logs -n istio-system -l istio=ingressgateway --tail=50
```

The access log shows the response code and flags:

- `404 NR` - No route found (VirtualService not matching)
- `503 UH` - No healthy upstream (backend service is down)
- `503 UF` - Upstream connection failure
- `426` - Upgrade required (trying HTTP when HTTPS is configured)

## Step 7: Check Backend Service Health

If the ingress gateway is receiving the request but returning 503, the backend might be unhealthy:

```bash
# Check backend pods
kubectl get pods -l app=my-app

# Check backend endpoints
kubectl get endpoints my-app

# Check from the ingress gateway's perspective
istioctl proxy-config endpoints $INGRESS_POD.istio-system --cluster "outbound|8080||my-app.default.svc.cluster.local"
```

## Step 8: Debug TLS Issues

TLS problems at the ingress are common. Here are the main scenarios:

### Certificate not found

```bash
kubectl logs -n istio-system -l istio=ingressgateway | grep "Failed to load"
```

### Certificate expired

```bash
kubectl get secret my-tls-secret -n istio-system -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

### Wrong certificate for the host

```bash
kubectl get secret my-tls-secret -n istio-system -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep "Subject Alternative Name" -A 1
```

### Testing TLS handshake

```bash
openssl s_client -connect EXTERNAL_IP:443 -servername my-app.example.com
```

## Full Debugging Script

Here is a script that checks all the common ingress issues at once:

```bash
#!/bin/bash
GATEWAY_NS="istio-system"
GATEWAY_LABEL="istio=ingressgateway"

echo "=== IngressGateway Service ==="
kubectl get svc istio-ingressgateway -n $GATEWAY_NS

echo ""
echo "=== IngressGateway Pods ==="
kubectl get pods -n $GATEWAY_NS -l $GATEWAY_LABEL

echo ""
echo "=== Gateways ==="
kubectl get gateway --all-namespaces

echo ""
echo "=== VirtualServices ==="
kubectl get virtualservice --all-namespaces

echo ""
echo "=== IngressGateway Listeners ==="
INGRESS_POD=$(kubectl get pod -n $GATEWAY_NS -l $GATEWAY_LABEL -o jsonpath='{.items[0].metadata.name}')
istioctl proxy-config listeners $INGRESS_POD.$GATEWAY_NS

echo ""
echo "=== IngressGateway Routes ==="
istioctl proxy-config routes $INGRESS_POD.$GATEWAY_NS

echo ""
echo "=== Recent Logs ==="
kubectl logs -n $GATEWAY_NS -l $GATEWAY_LABEL --tail=20
```

Ingress debugging in Istio is all about following the path from the load balancer through the Gateway resource, into the VirtualService routing, and down to the backend service. Check each layer systematically and the root cause usually shows up pretty quickly.
