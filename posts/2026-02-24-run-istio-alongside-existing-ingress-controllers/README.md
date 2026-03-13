# How to Run Istio Alongside Existing Ingress Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Ingresses, Networking, Service Mesh

Description: A practical guide to running Istio service mesh alongside existing ingress controllers like NGINX or Traefik without breaking your current traffic flow.

---

Most teams adopting Istio already have an ingress controller running in production. Whether it is NGINX, Traefik, HAProxy, or something else, ripping it out and replacing it with Istio's ingress gateway on day one is rarely a good idea. The better approach is running both side by side, migrating traffic gradually, and only removing the old ingress controller once you are confident everything works.

This guide walks through exactly how to set that up.

## Why Run Both at the Same Time?

Running Istio alongside your existing ingress controller gives you a few big advantages:

- **Zero downtime migration** - you can shift traffic between the two controllers gradually
- **Rollback safety** - if something goes wrong with Istio routing, your old ingress still works
- **Selective adoption** - some services can use Istio ingress while others stay on the old controller
- **Team learning curve** - your team gets time to learn Istio without production pressure

## Prerequisites

You should have a Kubernetes cluster with an existing ingress controller (we will use NGINX as the example) and Istio installed. If you have not installed Istio yet:

```bash
istioctl install --set profile=default
```

Verify both are running:

```bash
kubectl get pods -n ingress-nginx
kubectl get pods -n istio-system
```

## Understanding the Architecture

When you run both controllers, each gets its own LoadBalancer service. Your DNS entries determine which controller handles which traffic. The key insight is that both can coexist peacefully because they watch different resource types:

- NGINX Ingress Controller watches `Ingress` resources (or `IngressClass` resources assigned to it)
- Istio Ingress Gateway watches `Gateway` and `VirtualService` resources

They do not conflict because they are looking at completely different Kubernetes objects.

## Step 1: Verify Your Existing NGINX Ingress

First, check what you currently have running:

```bash
kubectl get ingress --all-namespaces
kubectl get svc -n ingress-nginx
```

Note the external IP of your NGINX ingress:

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Step 2: Deploy Istio Ingress Gateway

Istio's default installation includes an ingress gateway. Check it is running:

```bash
kubectl get svc -n istio-system istio-ingressgateway
```

The output should show a LoadBalancer service with its own external IP:

```text
NAME                   TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)
istio-ingressgateway   LoadBalancer   10.96.45.123   34.56.78.90    15021:31234/TCP,80:30080/TCP,443:30443/TCP
```

If you need to customize the gateway deployment, create an IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
  namespace: istio-system
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
```

## Step 3: Set Up DNS for Both Controllers

The simplest approach is to use different hostnames for each controller. Say you have `api.example.com` currently pointing to NGINX. You can set up a new hostname like `api-v2.example.com` pointing to Istio's gateway for testing:

```bash
# Get Istio gateway IP
ISTIO_IP=$(kubectl get svc -n istio-system istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Add DNS record for testing (in your DNS provider)
# api-v2.example.com -> $ISTIO_IP
```

For a weighted migration, you can use DNS-based traffic splitting or a cloud load balancer in front of both.

## Step 4: Create Istio Gateway and VirtualService

Now configure Istio to handle traffic for the new hostname:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: api-gateway
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
    - "api-v2.example.com"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "api-v2.example.com"
    tls:
      mode: SIMPLE
      credentialName: api-tls-cert
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
  namespace: default
spec:
  hosts:
  - "api-v2.example.com"
  gateways:
  - istio-system/api-gateway
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: api-service
        port:
          number: 8080
```

Apply these:

```bash
kubectl apply -f gateway.yaml
kubectl apply -f virtualservice.yaml
```

## Step 5: Keep Your NGINX Ingress Running

Your existing NGINX Ingress resources stay exactly as they are:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

Both routes point to the same backend service. Traffic coming through `api.example.com` hits NGINX, and traffic through `api-v2.example.com` hits Istio.

## Step 6: Handle Sidecar Injection Carefully

One tricky part: if you enable Istio sidecar injection for a namespace, your pods will get Envoy sidecars. This is fine and actually beneficial, but you need to make sure your NGINX ingress can still reach those pods.

The good news is that by default, Istio allows traffic from any source to reach pods on their original ports. You do not need to create any special policies for this unless you have enabled strict mTLS with restrictive authorization policies.

If you do have strict policies, add a policy that allows traffic from the NGINX ingress:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nginx-ingress
  namespace: default
spec:
  rules:
  - from:
    - source:
        namespaces: ["ingress-nginx"]
```

## Step 7: Migrate Traffic Gradually

Once you have verified that traffic flows correctly through Istio, start migrating:

1. **Test with internal traffic first** - point a few internal services to the Istio gateway
2. **Move non-critical services** - migrate staging or low-traffic services next
3. **Switch DNS for production** - update the DNS record for `api.example.com` to point to the Istio gateway IP
4. **Keep NGINX as fallback** - do not delete it yet, keep the old DNS record available under a different name

```bash
# When ready, update the Istio Gateway to accept the production hostname
kubectl patch gateway api-gateway -n istio-system --type merge -p '{
  "spec": {
    "servers": [{
      "port": {"number": 80, "name": "http", "protocol": "HTTP"},
      "hosts": ["api.example.com", "api-v2.example.com"]
    }]
  }
}'
```

## Step 8: Monitor Both Paths

Use Istio's built-in telemetry to compare traffic patterns:

```bash
# Check Istio gateway metrics
kubectl exec -n istio-system deploy/istio-ingressgateway -- pilot-agent request GET stats | grep downstream_rq

# Check NGINX metrics (if you have metrics enabled)
kubectl get --raw "/api/v1/namespaces/ingress-nginx/pods/$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].metadata.name}')/proxy/metrics" | grep nginx_ingress_controller_requests
```

## Common Pitfalls

**Port conflicts**: Both controllers need their own LoadBalancer service. On bare-metal clusters with MetalLB, make sure you have enough IPs allocated.

**TLS certificate management**: If you use cert-manager, you will need separate Certificate resources for each ingress controller, even if the domain is the same.

**Health check paths**: Istio's ingress gateway uses port 15021 for health checks, not the standard ports your cloud load balancer might expect. Configure your health checks accordingly.

**IngressClass conflicts**: If you are using Kubernetes IngressClass resources, make sure each controller only watches its own class. Set the `ingressClassName` field explicitly on every Ingress resource.

## Cleaning Up the Old Controller

Once all traffic is flowing through Istio and you are confident in the setup, you can remove the old ingress controller:

```bash
# Remove old ingress resources first
kubectl delete ingress api-ingress -n default

# Then remove the controller
helm uninstall ingress-nginx -n ingress-nginx
kubectl delete namespace ingress-nginx
```

But do not rush this step. Running both controllers for weeks or even months is completely fine and gives you the safety net you need during migration.

## Summary

Running Istio alongside an existing ingress controller is straightforward because they operate on different Kubernetes resource types. The key is to use separate DNS entries or hostnames during migration, keep your existing setup running as a fallback, and move traffic gradually. This approach removes the risk of a big-bang migration and lets your team build confidence with Istio at a comfortable pace.
