# How to Set Up Global Load Balancing Across Talos Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Load Balancing, Multi-Cluster, Global Server Load Balancing

Description: Step-by-step instructions for setting up global load balancing across multiple Talos Linux clusters for high availability and geographic traffic distribution.

---

When you run Talos Linux clusters in multiple regions, you want traffic to reach the closest healthy cluster. A user in Europe should hit your EU cluster, not wait for packets to cross the Atlantic to reach US-East. And when a cluster goes down, traffic should automatically shift to the surviving clusters without anyone paging an engineer at 3 AM.

Global load balancing makes this happen. This guide covers practical approaches to routing traffic across multiple Talos Linux clusters.

## How Global Load Balancing Works

Global load balancing operates at the DNS or network edge layer, sitting in front of all your clusters. When a client makes a request, the global load balancer decides which cluster should handle it based on factors like geographic proximity, cluster health, current load, or custom routing rules.

This is different from the load balancing that happens within a single cluster (which Kubernetes handles with Services and Ingress controllers). Global load balancing is the layer above that, directing traffic to the right cluster in the first place.

## Option 1: DNS-Based Global Load Balancing

The most straightforward approach uses DNS to route traffic. You configure DNS records with health checks, and the DNS provider returns different IP addresses based on the client location or endpoint health.

### Using Cloudflare Load Balancing

Cloudflare is a popular choice for DNS-based global load balancing. Set up a pool for each Talos cluster:

```bash
# Create origin pools (using Cloudflare API)
# Pool for US cluster
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/load_balancers/pools" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "talos-us",
    "origins": [
      {
        "name": "talos-us-ingress",
        "address": "203.0.113.10",
        "enabled": true
      }
    ],
    "monitor": "'$HEALTH_MONITOR_ID'",
    "notification_email": "ops@example.com"
  }'

# Pool for EU cluster
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/load_balancers/pools" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "talos-eu",
    "origins": [
      {
        "name": "talos-eu-ingress",
        "address": "198.51.100.10",
        "enabled": true
      }
    ],
    "monitor": "'$HEALTH_MONITOR_ID'"
  }'
```

Create a health monitor to check your clusters:

```bash
# Create a health check monitor
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/load_balancers/monitors" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "https",
    "description": "Talos cluster health",
    "method": "GET",
    "path": "/healthz",
    "port": 443,
    "interval": 30,
    "retries": 2,
    "timeout": 5,
    "expected_codes": "200"
  }'
```

Finally, create the load balancer that ties the pools together:

```bash
# Create the global load balancer
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/load_balancers" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "app.example.com",
    "default_pools": ["'$US_POOL_ID'", "'$EU_POOL_ID'"],
    "fallback_pool": "'$US_POOL_ID'",
    "steering_policy": "geo",
    "region_pools": {
      "NAM": ["'$US_POOL_ID'"],
      "EUR": ["'$EU_POOL_ID'"]
    },
    "proxied": true
  }'
```

### Using AWS Route53

If your Talos clusters run on AWS, Route53 provides latency-based and geolocation routing:

```bash
# Create a health check for the US cluster
aws route53 create-health-check --caller-reference "talos-us-$(date +%s)" \
  --health-check-config '{
    "IPAddress": "203.0.113.10",
    "Port": 443,
    "Type": "HTTPS",
    "ResourcePath": "/healthz",
    "RequestInterval": 30,
    "FailureThreshold": 3
  }'

# Create latency-based records
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "us-east",
        "Region": "us-east-1",
        "TTL": 60,
        "ResourceRecords": [{"Value": "203.0.113.10"}],
        "HealthCheckId": "'$US_HEALTH_CHECK_ID'"
      }
    }]
  }'
```

## Option 2: Kubernetes-Native Global Load Balancing

For a more Kubernetes-native approach, you can use tools that integrate directly with your clusters.

### Using K8GB (Kubernetes Global Balancer)

K8GB is an open-source global load balancer designed specifically for multi-cluster Kubernetes. It works with CoreDNS and uses a lightweight approach that does not require external cloud services.

Install K8GB on each Talos cluster:

```bash
# Add the K8GB Helm repo
helm repo add k8gb https://www.k8gb.io
helm repo update

# Install on cluster-us
helm install k8gb k8gb/k8gb \
  --namespace k8gb \
  --create-namespace \
  --set k8gb.dnsZone="example.com" \
  --set k8gb.edgeDNSZone="dns.example.com" \
  --set k8gb.edgeDNSServers[0]="1.2.3.4" \
  --set k8gb.clusterGeoTag="us" \
  --set k8gb.extGslbClustersGeoTags="eu"
```

Then create a Gslb resource that defines your load balancing strategy:

```yaml
# gslb.yaml
apiVersion: k8gb.absa.oss/v1beta1
kind: Gslb
metadata:
  name: app-gslb
  namespace: default
spec:
  ingress:
    ingressClassName: nginx
    rules:
      - host: app.example.com
        http:
          paths:
            - path: /
              pathType: Prefix
              backend:
                service:
                  name: app-service
                  port:
                    number: 80
  strategy:
    type: roundRobin
    # Or use failover strategy
    # type: failover
    # primaryGeoTag: us
```

Apply this on both clusters, and K8GB handles the DNS-based global load balancing between them.

## Setting Up Health Endpoints on Talos Clusters

Regardless of which load balancing approach you use, you need reliable health check endpoints. Deploy a dedicated health check service on each cluster:

```yaml
# health-endpoint.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-health
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cluster-health
  template:
    metadata:
      labels:
        app: cluster-health
    spec:
      containers:
        - name: health
          image: nginx:1.25-alpine
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
          volumeMounts:
            - name: config
              mountPath: /etc/nginx/conf.d
      volumes:
        - name: config
          configMap:
            name: health-nginx-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: health-nginx-config
  namespace: kube-system
data:
  default.conf: |
    server {
        listen 8080;
        location /healthz {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
---
apiVersion: v1
kind: Service
metadata:
  name: cluster-health
  namespace: kube-system
spec:
  type: LoadBalancer
  selector:
    app: cluster-health
  ports:
    - port: 443
      targetPort: 8080
```

A better health check goes beyond just returning 200. It should verify that critical services are running, that the cluster has capacity, and that dependent services are reachable. This gives the global load balancer meaningful signals for routing decisions.

## Failover Testing

Never trust a failover system you have not tested. Regularly simulate cluster failures:

```bash
# Simulate a cluster failure by scaling down the health endpoint
kubectl scale deployment cluster-health --replicas=0 -n kube-system

# Watch the global load balancer detect the failure
# Check DNS resolution changes
watch -n 5 'dig +short app.example.com'

# Restore the cluster
kubectl scale deployment cluster-health --replicas=2 -n kube-system
```

Monitor how long it takes for traffic to shift and shift back. DNS-based approaches typically have a failover time equal to the TTL plus health check interval. For tighter failover, use lower TTLs or an anycast-based solution.

## Practical Considerations

DNS-based global load balancing is the most common approach and works well for most use cases. The TTL-based propagation delay is usually acceptable for non-real-time applications. If you need sub-second failover, look at anycast-based solutions or deploy an edge proxy layer with active health checking.

For Talos Linux clusters specifically, make sure your Ingress controller load balancer IPs are stable. If you are using MetalLB for bare metal deployments, assign static IPs that the global load balancer can monitor reliably.

Global load balancing is one of those things that seems like overkill until you need it. When a cluster goes down at 2 AM and traffic silently shifts to a healthy cluster, you will be glad you set it up.
