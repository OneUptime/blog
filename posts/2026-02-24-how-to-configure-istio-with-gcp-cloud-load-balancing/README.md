# How to Configure Istio with GCP Cloud Load Balancing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GCP, Load Balancing, GKE, Kubernetes

Description: How to integrate Istio service mesh with Google Cloud Load Balancing including external HTTP(S), TCP/SSL proxy, and internal load balancers.

---

Google Cloud offers several load balancing options, and each one pairs differently with Istio. The default behavior when you deploy the Istio ingress gateway on GKE is to get an external TCP/UDP network load balancer. But depending on your needs, you might want a global HTTP(S) load balancer for CDN and Cloud Armor integration, or an internal load balancer for private services. Here is how each option works with Istio.

## Default: External Network Load Balancer

When you install Istio on GKE with default settings, the ingress gateway service creates a regional external TCP/UDP load balancer:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

This load balancer passes TCP traffic straight through to the Istio gateway pods. TLS termination happens at the Istio gateway level. This is the simplest setup and works well for most use cases.

## Option 1: Global External HTTP(S) Load Balancer

The GCP global HTTP(S) load balancer gives you Cloud CDN, Cloud Armor WAF, global anycast IPs, and SSL certificates managed by Google. To use it with Istio, you configure a NEG (Network Endpoint Group) backend:

First, configure the Istio ingress gateway service to use container-native load balancing:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: ClusterIP
        serviceAnnotations:
          cloud.google.com/neg: '{"exposed_ports":{"8080":{"name":"istio-http-neg"},"8443":{"name":"istio-https-neg"}}}'
```

The `cloud.google.com/neg` annotation tells GKE to create NEGs that the HTTP(S) load balancer can use as backends.

Now create the load balancer using gcloud:

```bash
# Create a health check
gcloud compute health-checks create http istio-health-check \
  --port 15021 \
  --request-path /healthz/ready

# Create a backend service
gcloud compute backend-services create istio-backend \
  --protocol HTTP \
  --port-name http \
  --health-checks istio-health-check \
  --global

# Add the NEG as a backend
gcloud compute backend-services add-backend istio-backend \
  --network-endpoint-group istio-http-neg \
  --network-endpoint-group-zone us-central1-a \
  --balancing-mode RATE \
  --max-rate-per-endpoint 100 \
  --global

# Create a URL map
gcloud compute url-maps create istio-url-map \
  --default-service istio-backend

# Create a managed SSL certificate
gcloud compute ssl-certificates create app-cert \
  --domains app.example.com \
  --global

# Create the HTTPS proxy
gcloud compute target-https-proxies create istio-https-proxy \
  --url-map istio-url-map \
  --ssl-certificates app-cert

# Create a global forwarding rule
gcloud compute forwarding-rules create istio-https-rule \
  --global \
  --target-https-proxy istio-https-proxy \
  --ports 443
```

Since the HTTP(S) load balancer terminates TLS, configure the Istio Gateway to accept plain HTTP:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 8080
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
```

## Adding Cloud Armor for WAF

One of the biggest advantages of the HTTP(S) load balancer is Cloud Armor integration:

```bash
# Create a security policy
gcloud compute security-policies create istio-waf-policy \
  --description "WAF policy for Istio"

# Add OWASP ModSecurity rules
gcloud compute security-policies rules create 1000 \
  --security-policy istio-waf-policy \
  --expression "evaluatePreconfiguredExpr('sqli-v33-stable')" \
  --action deny-403

gcloud compute security-policies rules create 1001 \
  --security-policy istio-waf-policy \
  --expression "evaluatePreconfiguredExpr('xss-v33-stable')" \
  --action deny-403

# Attach the policy to the backend service
gcloud compute backend-services update istio-backend \
  --security-policy istio-waf-policy \
  --global
```

## Option 2: Internal HTTP(S) Load Balancer

For services that should only be accessible within your VPC, use an internal load balancer:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-internal-gateway
      enabled: true
      label:
        istio: internalgateway
      k8s:
        serviceAnnotations:
          networking.gke.io/load-balancer-type: "Internal"
          cloud.google.com/neg: '{"ingress": true}'
        service:
          type: LoadBalancer
```

This creates an internal TCP load balancer. For an internal HTTP(S) load balancer with more features, use the GKE Gateway API:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: internal-gateway
  namespace: istio-system
  annotations:
    networking.gke.io/certmap: my-cert-map
spec:
  gatewayClassName: gke-l7-rilb
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
  addresses:
  - type: NamedAddress
    value: internal-gateway-ip
```

## Option 3: TCP/SSL Proxy Load Balancer

If you want a global load balancer that passes TCP through (no HTTP termination), use the TCP proxy:

```bash
# Create a health check
gcloud compute health-checks create http istio-tcp-health \
  --port 15021 \
  --request-path /healthz/ready

# Create a TCP proxy backend service
gcloud compute backend-services create istio-tcp-backend \
  --protocol TCP \
  --health-checks istio-tcp-health \
  --global

# Add the NEG backend
gcloud compute backend-services add-backend istio-tcp-backend \
  --network-endpoint-group istio-https-neg \
  --network-endpoint-group-zone us-central1-a \
  --balancing-mode CONNECTION \
  --max-connections-per-endpoint 1000 \
  --global

# Create a TCP proxy
gcloud compute target-tcp-proxies create istio-tcp-proxy \
  --backend-service istio-tcp-backend

# Create the forwarding rule
gcloud compute forwarding-rules create istio-tcp-rule \
  --global \
  --target-tcp-proxy istio-tcp-proxy \
  --ports 443
```

This gives you global anycast IPs and DDoS protection while letting Istio handle TLS termination.

## Preserving Client IP

With the HTTP(S) load balancer, the client IP is in the X-Forwarded-For header. Configure Istio to trust it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 2
```

Set numTrustedProxies to 2 because GCP's load balancer adds a hop and the gateway adds another.

For TCP/SSL proxy load balancers, enable PROXY protocol:

```bash
gcloud compute target-tcp-proxies update istio-tcp-proxy \
  --proxy-header PROXY_V1
```

## Cloud CDN Integration

If you use the HTTP(S) load balancer, you can enable Cloud CDN for static content:

```bash
gcloud compute backend-services update istio-backend \
  --enable-cdn \
  --global
```

Configure cache policies:

```bash
gcloud compute backend-services update istio-backend \
  --cache-mode CACHE_ALL_STATIC \
  --default-ttl 3600 \
  --global
```

Your Istio VirtualService can still handle all the routing logic, while Cloud CDN caches responses at Google's edge network.

## Health Checks

GCP load balancers need to health check the backends. Istio's status port (15021) exposes a health endpoint:

```bash
# Verify the health endpoint works
kubectl exec deploy/istio-ingressgateway -n istio-system -- \
  curl -s localhost:15021/healthz/ready
```

Make sure your firewall rules allow health check traffic from GCP's health check ranges (130.211.0.0/22 and 35.191.0.0/16):

```bash
gcloud compute firewall-rules create allow-health-checks \
  --network default \
  --allow tcp:15021 \
  --source-ranges 130.211.0.0/22,35.191.0.0/16 \
  --target-tags gke-istio-cluster-node
```

GCP Cloud Load Balancing paired with Istio gives you a powerful combination. Use the HTTP(S) load balancer when you need Cloud Armor, CDN, or Google-managed certificates. Use the TCP proxy for global load balancing with Istio-managed TLS. And use the internal load balancer for private services. Each option has its place depending on your requirements.
