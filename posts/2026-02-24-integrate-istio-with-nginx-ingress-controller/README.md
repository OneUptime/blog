# How to Integrate Istio with NGINX Ingress Controller

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, NGINX, Ingress Controller, Kubernetes, Networking

Description: How to run NGINX Ingress Controller alongside Istio service mesh and get the best of both tools.

---

Running NGINX Ingress Controller alongside Istio might seem redundant at first glance. After all, both handle ingress traffic. But there are legitimate reasons to use them together. Maybe your team already has a ton of NGINX Ingress resources configured and you are gradually migrating to Istio. Or you need NGINX-specific features like complex regex-based routing or rate limiting that work differently than Istio's approach. Whatever the reason, they can coexist without stepping on each other.

## Two Integration Patterns

There are two main ways to set this up:

**Pattern 1: NGINX in front of Istio** - NGINX handles external traffic and forwards it to services inside the mesh. The NGINX pods get Istio sidecars, so all traffic from NGINX to backend services is covered by mTLS.

**Pattern 2: NGINX alongside Istio** - Both NGINX and Istio handle different ingress traffic. Some services are exposed through NGINX Ingress, others through the Istio Gateway.

Pattern 1 is the most common, so that is what we will focus on.

## Installing NGINX Ingress Controller with Istio Sidecar

Install NGINX Ingress Controller using Helm. The key is to make sure the NGINX pods get the Istio sidecar injected:

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.podAnnotations."sidecar\.istio\.io/inject"="true"
```

Make sure the `ingress-nginx` namespace has the Istio injection label:

```bash
kubectl label namespace ingress-nginx istio-injection=enabled
```

Verify that the NGINX pods have the sidecar:

```bash
kubectl get pods -n ingress-nginx -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'
```

You should see both `controller` and `istio-proxy` containers in each pod.

## Handling Port Conflicts

Istio's sidecar proxy listens on port 15006 for inbound traffic and redirects all inbound traffic through itself using iptables rules. This can cause issues with NGINX because NGINX also needs to receive traffic directly on its ports.

To fix this, you need to tell Istio not to intercept traffic on the ports NGINX listens on:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/includeInboundPorts: ""
        traffic.sidecar.istio.io/excludeInboundPorts: "80,443"
        traffic.sidecar.istio.io/excludeOutboundIPRanges: ""
```

Or through the Helm values:

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.podAnnotations."sidecar\.istio\.io/inject"="true" \
  --set controller.podAnnotations."traffic\.sidecar\.istio\.io/includeInboundPorts"="" \
  --set controller.podAnnotations."traffic\.sidecar\.istio\.io/excludeInboundPorts"="80\,443"
```

This tells the Istio sidecar to not capture inbound traffic to ports 80 and 443. External traffic hits NGINX directly, and NGINX's outbound traffic to backend services goes through the Istio sidecar.

## Creating Ingress Resources

With NGINX handling ingress and Istio handling mesh traffic, create your Ingress resources as you normally would:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app
            port:
              number: 8080
```

The traffic flow is: external request hits NGINX, NGINX connects to the backend service, that connection goes through the Istio sidecar (mTLS), and reaches the backend pod's sidecar which forwards to the actual application.

## Configuring mTLS Between NGINX and Backend Services

Because NGINX pods have Istio sidecars, the outbound connections from NGINX to backend services automatically get mTLS. You can verify this:

```bash
# Check that mTLS is being used
istioctl authn tls-check <nginx-pod-name>.ingress-nginx <backend-service>.default.svc.cluster.local
```

If you are using STRICT mTLS mode in your mesh:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Then all traffic from NGINX to mesh services will use mTLS. This is handled transparently by the sidecars.

## Using Istio Features with NGINX Traffic

Since NGINX traffic enters the mesh through sidecars, you can apply Istio policies to it. For example, you can use DestinationRules for load balancing:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app
spec:
  host: my-app.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
    loadBalancer:
      simple: LEAST_REQUEST
```

And AuthorizationPolicies to control access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nginx
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/ingress-nginx/sa/ingress-nginx"]
    to:
    - operation:
        methods: ["GET", "POST"]
```

This allows only the NGINX Ingress Controller's service account to access the backend service.

## Gradual Migration from NGINX to Istio Gateway

If you plan to eventually migrate everything to Istio Gateway, you can do it service by service. Keep both NGINX and Istio ingress gateway running:

```yaml
# Istio Gateway for new services
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: new-service-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: new-service-tls
    hosts:
    - new-service.example.com
```

Point different DNS records at different load balancers. Old services go through NGINX, new ones go through the Istio gateway. Over time, migrate NGINX Ingress resources to Istio Gateway and VirtualService resources.

## Troubleshooting

If backend services are not reachable from NGINX:

```bash
# Check NGINX logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Check the sidecar logs
kubectl logs -n ingress-nginx <nginx-pod> -c istio-proxy

# Verify the sidecar configuration
istioctl proxy-config clusters <nginx-pod>.ingress-nginx
```

A common mistake is not excluding inbound ports, which causes NGINX to receive traffic through the sidecar instead of directly. This creates routing loops and connection failures.

Running NGINX Ingress Controller with Istio is a practical setup for teams that are either migrating incrementally or need specific NGINX features. The sidecar injection makes the integration smooth because NGINX traffic automatically participates in the mesh. The important things to get right are the port exclusions and making sure the NGINX namespace has sidecar injection enabled.
