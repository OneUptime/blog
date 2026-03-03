# How to Set Up Multi-Cluster Ingress with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Ingress, Kubernetes, Load Balancing

Description: How to configure Istio ingress gateways across multiple clusters to handle external traffic with global load balancing.

---

Multi-cluster ingress is about getting external traffic into your multi-cluster Istio mesh. You have several options: run an ingress gateway in each cluster with DNS-based load balancing, use a single ingress gateway that routes to backends in all clusters, or put a global load balancer in front of everything. This guide covers each approach with concrete configurations.

## Option 1: Ingress Gateway Per Cluster with DNS Load Balancing

This is the most common approach. Each cluster runs its own Istio ingress gateway, and a DNS service distributes external traffic across them.

### Set Up Ingress Gateways

Both clusters get an ingress gateway as part of the standard Istio installation:

```bash
# Get the external IPs
kubectl --context=cluster1 get svc -n istio-system istio-ingressgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

kubectl --context=cluster2 get svc -n istio-system istio-ingressgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### Configure the Same Gateway and VirtualService in Both Clusters

Apply identical Istio Gateway and VirtualService resources in both clusters:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
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
        credentialName: app-tls-cert
      hosts:
        - "app.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
      tls:
        httpsRedirect: true
```

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routing
  namespace: production
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: my-app.production.svc.cluster.local
            port:
              number: 8080
```

Apply to both clusters:

```bash
kubectl --context=cluster1 apply -f gateway.yaml
kubectl --context=cluster1 apply -f virtualservice.yaml

kubectl --context=cluster2 apply -f gateway.yaml
kubectl --context=cluster2 apply -f virtualservice.yaml
```

### Set Up DNS Load Balancing

Use your DNS provider's load balancing features. Here's an example with Google Cloud DNS:

```bash
# Create a health check
gcloud compute health-checks create http istio-health-check \
  --port 15021 \
  --request-path /healthz/ready

# Set up DNS with weighted routing
gcloud dns record-sets transaction start --zone=my-zone
gcloud dns record-sets transaction add \
  --name="app.example.com." \
  --type=A \
  --ttl=60 \
  --routing-policy-type=WRR \
  --routing-policy-data="50=CLUSTER1_IP;50=CLUSTER2_IP" \
  --zone=my-zone
gcloud dns record-sets transaction execute --zone=my-zone
```

### TLS Certificate Management

Each cluster needs the same TLS certificate. You can use cert-manager to automate this:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls-cert
  namespace: istio-system
spec:
  secretName: app-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "app.example.com"
```

Deploy cert-manager and this Certificate resource in both clusters. Both will get valid certificates for the same domain.

## Option 2: Single Ingress with Cross-Cluster Backends

If you want a single entry point, you can run the ingress gateway in one cluster and route to backends in all clusters:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routing
  namespace: production
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - match:
        - uri:
            prefix: /api/v2
      route:
        - destination:
            host: api-v2.production.svc.cluster.local
            port:
              number: 8080
    - route:
        - destination:
            host: api-v1.production.svc.cluster.local
            port:
              number: 8080
```

If `api-v2` only exists in cluster2, the ingress gateway in cluster1 will route traffic to it through the east-west gateway. No special configuration needed since Istio discovers endpoints across clusters automatically.

This approach is simpler but creates a single point of failure at the ingress cluster.

## Option 3: Global Load Balancer in Front

For production environments, put a global load balancer (like AWS Global Accelerator, Google Cloud Global Load Balancer, or Cloudflare) in front of the Istio ingress gateways:

```text
Internet -> Global LB -> Istio Ingress (cluster1)
                      -> Istio Ingress (cluster2)
```

The global load balancer handles:
- Geographic routing (send users to the nearest cluster)
- Health checking (remove unhealthy clusters)
- DDoS protection
- SSL termination (optional)

Example with AWS Global Accelerator:

```bash
# Create accelerator
aws globalaccelerator create-accelerator \
  --name istio-multi-cluster \
  --ip-address-type IPV4

# Add listener
aws globalaccelerator create-listener \
  --accelerator-arn arn:aws:globalaccelerator::123456:accelerator/abc \
  --port-ranges '[{"FromPort":443,"ToPort":443}]' \
  --protocol TCP

# Add endpoint groups for each cluster
aws globalaccelerator create-endpoint-group \
  --listener-arn arn:aws:globalaccelerator::123456:listener/abc/def \
  --endpoint-group-region us-east-1 \
  --endpoint-configurations '[{"EndpointId":"CLUSTER1_NLB_ARN","Weight":50}]' \
  --health-check-port 15021 \
  --health-check-path /healthz/ready

aws globalaccelerator create-endpoint-group \
  --listener-arn arn:aws:globalaccelerator::123456:listener/abc/def \
  --endpoint-group-region us-west-2 \
  --endpoint-configurations '[{"EndpointId":"CLUSTER2_NLB_ARN","Weight":50}]' \
  --health-check-port 15021 \
  --health-check-path /healthz/ready
```

## Configuring Health Check Endpoints

Regardless of which approach you use, you need health check endpoints. The Istio ingress gateway provides one by default:

```bash
curl http://${GATEWAY_IP}:15021/healthz/ready
```

For more comprehensive health checks that verify your application is actually working, create a dedicated health check VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: health-check
  namespace: production
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - match:
        - uri:
            exact: /healthz
      route:
        - destination:
            host: health-service.production.svc.cluster.local
            port:
              number: 8080
```

The health service should check connectivity to key dependencies (database, cache, etc.) and return a meaningful status.

## Handling Sticky Sessions

If your application needs sticky sessions across clusters, you have a challenge. Istio supports consistent hashing for load balancing within a cluster:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app.production.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: SERVERID
          ttl: 0s
```

But this only works within the endpoints known to a single proxy. Across clusters with DNS-based load balancing, you need to handle session affinity at the DNS or global load balancer level.

## Monitoring Multi-Cluster Ingress

Track traffic distribution across clusters:

```bash
# Check request rates per cluster
istioctl --context=cluster1 dashboard prometheus &

# Query
# sum(rate(istio_requests_total{reporter="destination", destination_service="my-app.production.svc.cluster.local"}[5m]))
```

Compare the request rates between clusters to make sure traffic is distributed as expected.

```bash
# Check for errors at the ingress gateway
kubectl --context=cluster1 logs -n istio-system deploy/istio-ingressgateway --tail=50
kubectl --context=cluster2 logs -n istio-system deploy/istio-ingressgateway --tail=50
```

Multi-cluster ingress with Istio gives you flexibility in how external traffic enters your mesh. The per-cluster ingress with DNS load balancing approach is the most resilient, while the single ingress approach is the simplest. For production, adding a global load balancer on top gives you the best of both worlds: geographic routing, health checking, and DDoS protection at the edge.
