# How to Set Up Geographic Traffic Routing with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Geographic Routing, Traffic Management, Kubernetes, Multi-Region

Description: Set up geographic traffic routing with Istio to direct user requests to the nearest regional deployment for lower latency and data compliance.

---

Geographic traffic routing means sending users to the service instance closest to their physical location. A user in Tokyo hits the Asia-Pacific deployment, a user in London hits the European deployment, and a user in New York hits the US East deployment. This reduces latency, improves user experience, and can help with data residency requirements.

Istio handles geographic routing through a combination of locality load balancing (for east-west traffic within the mesh) and ingress configuration (for north-south traffic from external users). The full solution involves DNS-level routing for getting users to the right region and Istio locality settings for keeping traffic local once it enters the mesh.

## The Architecture

Geographic routing typically works in two layers:

**Layer 1 - DNS:** Route external users to the nearest region using GeoDNS (Route53 geolocation routing, Cloudflare geo-steering, etc.)

**Layer 2 - Istio:** Keep traffic local within the mesh using locality load balancing

## Layer 1: DNS-Based Geographic Routing

This part happens outside of Istio. You need a DNS provider that supports geographic routing.

### AWS Route53 Geolocation Routing

```bash
# Create geolocation records pointing to each region's ingress
aws route53 change-resource-record-sets --hosted-zone-id ZXXXXX --change-batch '{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.myapp.com",
        "Type": "A",
        "SetIdentifier": "us-east",
        "GeoLocation": {"ContinentCode": "NA"},
        "AliasTarget": {
          "HostedZoneId": "ZXXXXX",
          "DNSName": "us-east-1-ingress.myapp.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.myapp.com",
        "Type": "A",
        "SetIdentifier": "eu-west",
        "GeoLocation": {"ContinentCode": "EU"},
        "AliasTarget": {
          "HostedZoneId": "ZYYYYY",
          "DNSName": "eu-west-1-ingress.myapp.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}'
```

### Using ExternalDNS with Kubernetes

If you use ExternalDNS, annotate your Istio Gateway's Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.myapp.com
    external-dns.alpha.kubernetes.io/set-identifier: us-east-1
spec:
  type: LoadBalancer
  selector:
    istio: ingressgateway
  ports:
    - port: 80
      targetPort: 8080
    - port: 443
      targetPort: 8443
```

## Layer 2: Istio Ingress Gateway Per Region

Each region has its own Istio Ingress Gateway. Configure it to accept traffic for your domain:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: default
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
        credentialName: myapp-tls
      hosts:
        - "api.myapp.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "api.myapp.com"
```

Then route traffic to your services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routing
spec:
  hosts:
    - "api.myapp.com"
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1/users
      route:
        - destination:
            host: user-service
            port:
              number: 80
    - match:
        - uri:
            prefix: /api/v1/orders
      route:
        - destination:
            host: order-service
            port:
              number: 80
```

## Layer 3: Keep Internal Traffic Local

Once traffic enters the mesh through the regional ingress gateway, you want to keep it in the same region. Configure locality load balancing on each service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
spec:
  host: user-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1
            to: us-west-2
          - from: eu-west-1
            to: eu-central-1
          - from: ap-southeast-1
            to: ap-northeast-1
      simple: ROUND_ROBIN
```

This ensures that a request entering through the us-east-1 ingress gateway hits user-service pods in us-east-1, not pods in eu-west-1.

## Handling Data Residency Requirements

Some regulations (GDPR, data sovereignty laws) require that user data stays in specific geographic regions. Geographic routing helps with compliance, but you need to enforce it at multiple levels.

### Region-Specific Routing

Use Istio headers to tag requests with their origin region:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
spec:
  hosts:
    - user-service
  http:
    - match:
        - headers:
            x-user-region:
              exact: eu
      route:
        - destination:
            host: user-service
            subset: eu
    - route:
        - destination:
            host: user-service
            subset: default
```

Your ingress gateway or a front-proxy can set the `x-user-region` header based on the geographic DNS record that was used.

## Weighted Geographic Distribution

Instead of strict locality preference, you can distribute traffic across regions with explicit weights. This works well for capacity balancing across regions or for keeping secondary regions warm:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        distribute:
        - from: "us-east-1/*"
          to:
            "us-east-1/*": 80
            "us-west-2/*": 20
        - from: "eu-west-1/*"
          to:
            "eu-west-1/*": 90
            "eu-central-1/*": 10
```

Traffic from us-east-1 goes 80% local and 20% to us-west-2. EU traffic stays 90% within eu-west-1 with 10% going to eu-central-1 for warm standby.

## Fallback When a Region is Down

If an entire region goes down, DNS health checks should detect the failure and stop routing users to that region. But DNS propagation takes time (minutes to hours depending on TTL). During that window, Istio's failover can help:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
spec:
  host: user-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 100
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1
            to: us-west-2
      simple: ROUND_ROBIN
```

If the local region's pods are returning errors, Istio will failover traffic to the next region within seconds, much faster than DNS failover.

## Monitoring Geographic Distribution

Track where your traffic is coming from and where it is going:

```
# Requests by ingress gateway region
sum(rate(istio_requests_total{
  destination_service_name="user-service",
  source_workload="istio-ingressgateway"
}[5m])) by (source_workload_namespace)
```

Build a Grafana dashboard showing traffic per region:

```
# Traffic heatmap by region
sum(rate(istio_requests_total{reporter="source"}[5m])) by (source_workload, destination_workload)
```

## Testing Geographic Routing

### Test DNS Resolution

Check that DNS returns the right endpoint for each region:

```bash
# From a US machine
dig api.myapp.com
# Should return us-east-1 load balancer IP

# Using a specific DNS resolver in another region
dig @8.8.8.8 api.myapp.com
```

### Test with curl

```bash
# Direct to each region's ingress
curl -H "Host: api.myapp.com" https://us-east-1-ingress.myapp.com/api/v1/users
curl -H "Host: api.myapp.com" https://eu-west-1-ingress.myapp.com/api/v1/users
```

### Verify Locality

Check that requests entering through us-east-1 ingress hit us-east-1 service pods:

```bash
# Add a response header showing the pod's zone
kubectl logs -l app=user-service --tail=10 -f
```

## Performance Considerations

- **DNS TTL:** Set low TTLs (30-60 seconds) for faster failover, but this increases DNS query volume
- **Cross-region latency:** US East to EU West is roughly 70-100ms. US East to US West is 40-60ms. Keep this in mind when designing failover chains.
- **Data replication lag:** If your database uses async replication across regions, there will be a delay. Design your application to handle eventual consistency.

Geographic routing with Istio is not a single feature - it is a pattern built from DNS routing, ingress configuration, and locality load balancing working together. Each layer handles a different part of the problem, and together they create a system that routes users to the nearest available region with automatic failover when things go wrong.
