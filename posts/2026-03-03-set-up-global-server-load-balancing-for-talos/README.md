# How to Set Up Global Server Load Balancing for Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GSLB, Load Balancing, DNS, Multi-Region, Kubernetes, High Availability

Description: Implement Global Server Load Balancing for Talos Linux clusters across multiple regions to provide geographic traffic distribution and disaster recovery.

---

Global Server Load Balancing (GSLB) distributes traffic across multiple Talos Linux clusters in different geographic locations. Unlike regular load balancing which works within a single cluster, GSLB routes users to the nearest or healthiest cluster based on factors like geographic proximity, latency, server health, and capacity. This is essential for applications that need low latency worldwide and high availability across regions.

## How GSLB Works

GSLB typically operates at the DNS level. When a user queries your domain name, the GSLB system returns the IP address of the cluster that best serves that user. The decision can be based on:

- Geographic proximity (route to the nearest cluster)
- Health checks (route away from unhealthy clusters)
- Latency measurements (route to the fastest responding cluster)
- Weighted distribution (send a percentage of traffic to each cluster)
- Server capacity (route to clusters with available resources)

## Architecture Overview

A typical GSLB setup for Talos Linux looks like this:

```
User (Europe)  -> DNS GSLB -> Talos Cluster EU (Frankfurt)
User (US East) -> DNS GSLB -> Talos Cluster US-East (Virginia)
User (Asia)    -> DNS GSLB -> Talos Cluster Asia (Tokyo)
```

Each cluster runs the same application stack, and the GSLB system directs users to the optimal cluster.

## Option 1: DNS-Based GSLB with Route53

AWS Route53 provides built-in GSLB features through its routing policies:

### Geolocation Routing

Route users to the nearest cluster based on their location:

```bash
# Create health checks for each cluster
aws route53 create-health-check --caller-reference "talos-eu-$(date +%s)" \
    --health-check-config '{
        "IPAddress": "203.0.113.10",
        "Port": 443,
        "Type": "HTTPS",
        "ResourcePath": "/healthz",
        "RequestInterval": 10,
        "FailureThreshold": 3
    }'

aws route53 create-health-check --caller-reference "talos-us-$(date +%s)" \
    --health-check-config '{
        "IPAddress": "203.0.113.20",
        "Port": 443,
        "Type": "HTTPS",
        "ResourcePath": "/healthz",
        "RequestInterval": 10,
        "FailureThreshold": 3
    }'
```

Create geolocation routing records:

```bash
# EU record
aws route53 change-resource-record-sets --hosted-zone-id Z123456 \
    --change-batch '{
        "Changes": [{
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "app.example.com",
                "Type": "A",
                "SetIdentifier": "eu",
                "GeoLocation": {"ContinentCode": "EU"},
                "TTL": 60,
                "ResourceRecords": [{"Value": "203.0.113.10"}],
                "HealthCheckId": "eu-health-check-id"
            }
        }]
    }'

# US record
aws route53 change-resource-record-sets --hosted-zone-id Z123456 \
    --change-batch '{
        "Changes": [{
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "app.example.com",
                "Type": "A",
                "SetIdentifier": "us",
                "GeoLocation": {"CountryCode": "US"},
                "TTL": 60,
                "ResourceRecords": [{"Value": "203.0.113.20"}],
                "HealthCheckId": "us-health-check-id"
            }
        }]
    }'

# Default (fallback) record for anywhere not explicitly covered
aws route53 change-resource-record-sets --hosted-zone-id Z123456 \
    --change-batch '{
        "Changes": [{
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "app.example.com",
                "Type": "A",
                "SetIdentifier": "default",
                "GeoLocation": {"CountryCode": "*"},
                "TTL": 60,
                "ResourceRecords": [{"Value": "203.0.113.10"}],
                "HealthCheckId": "eu-health-check-id"
            }
        }]
    }'
```

### Latency-Based Routing

Route users to the lowest-latency cluster:

```bash
# Latency-based records
aws route53 change-resource-record-sets --hosted-zone-id Z123456 \
    --change-batch '{
        "Changes": [{
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "app.example.com",
                "Type": "A",
                "SetIdentifier": "eu-west-1",
                "Region": "eu-west-1",
                "TTL": 60,
                "ResourceRecords": [{"Value": "203.0.113.10"}],
                "HealthCheckId": "eu-health-check-id"
            }
        }, {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "app.example.com",
                "Type": "A",
                "SetIdentifier": "us-east-1",
                "Region": "us-east-1",
                "TTL": 60,
                "ResourceRecords": [{"Value": "203.0.113.20"}],
                "HealthCheckId": "us-health-check-id"
            }
        }]
    }'
```

## Option 2: Cloudflare Load Balancing

Cloudflare provides GSLB through its load balancing product:

```bash
# Create a pool for each region
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/load_balancers/pools" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "talos-eu",
        "origins": [
            {
                "name": "eu-ingress",
                "address": "203.0.113.10",
                "enabled": true,
                "weight": 1
            }
        ],
        "monitor": "health-monitor-id",
        "check_regions": ["WEU"]
    }'

# Create the load balancer
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/load_balancers" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "app.example.com",
        "default_pools": ["pool-eu-id", "pool-us-id", "pool-asia-id"],
        "fallback_pool": "pool-eu-id",
        "steering_policy": "geo",
        "pop_pools": {
            "FRA": ["pool-eu-id"],
            "IAD": ["pool-us-id"],
            "NRT": ["pool-asia-id"]
        },
        "session_affinity": "cookie",
        "session_affinity_ttl": 3600
    }'
```

## Option 3: Open-Source GSLB with k8gb

k8gb (Kubernetes Global Balancer) is an open-source GSLB solution designed specifically for multi-cluster Kubernetes:

```bash
# Install k8gb on each Talos cluster
helm repo add k8gb https://www.k8gb.io
helm repo update

# Install on the EU cluster
helm install k8gb k8gb/k8gb \
    --namespace k8gb \
    --create-namespace \
    --set k8gb.dnsZone="example.com" \
    --set k8gb.edgeDNSZone="dns.example.com" \
    --set k8gb.edgeDNSServers[0]="ns1.example.com" \
    --set k8gb.clusterGeoTag="eu" \
    --set k8gb.extGslbClustersGeoTags="us\,asia"
```

Create a Gslb resource:

```yaml
apiVersion: k8gb.absa.oss/v1beta1
kind: Gslb
metadata:
  name: my-app
  namespace: production
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
              name: my-app
              port:
                number: 80
  strategy:
    type: roundRobin          # or geoip, failover
    dnsTtlSeconds: 30
    splitBrainThresholdSeconds: 300
```

## Health Checks for Each Cluster

GSLB depends on accurate health checks. Deploy health check endpoints in each Talos cluster:

```yaml
# health-endpoint.yaml - deploy in each cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gslb-health
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gslb-health
  template:
    metadata:
      labels:
        app: gslb-health
    spec:
      containers:
      - name: health
        image: nginx:alpine
        ports:
        - containerPort: 80
        readinessProbe:
          httpGet:
            path: /healthz
            port: 80
        livenessProbe:
          httpGet:
            path: /healthz
            port: 80
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
  namespace: monitoring
data:
  default.conf: |
    server {
        listen 80;
        location /healthz {
            access_log off;
            return 200 '{"status":"healthy","cluster":"eu","timestamp":"$time_iso8601"}';
            add_header Content-Type application/json;
        }
    }
---
apiVersion: v1
kind: Service
metadata:
  name: gslb-health
  namespace: monitoring
spec:
  type: LoadBalancer
  ports:
  - port: 80
  selector:
    app: gslb-health
```

## Monitoring GSLB

Track the health and traffic distribution across clusters:

```bash
#!/bin/bash
# check-gslb-health.sh
# Checks health status of all GSLB endpoints

CLUSTERS=(
    "EU:203.0.113.10"
    "US:203.0.113.20"
    "Asia:203.0.113.30"
)

echo "GSLB Health Check Report - $(date)"
echo "================================"

for entry in "${CLUSTERS[@]}"; do
    NAME="${entry%%:*}"
    IP="${entry##*:}"

    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://$IP/healthz")
    LATENCY=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 5 "https://$IP/healthz")

    if [ "$STATUS" -eq 200 ]; then
        echo "$NAME ($IP): HEALTHY - ${LATENCY}s"
    else
        echo "$NAME ($IP): UNHEALTHY - HTTP $STATUS"
    fi
done

# Check DNS resolution from different locations
echo ""
echo "DNS Resolution:"
dig +short app.example.com @8.8.8.8
```

## Data Synchronization Between Clusters

GSLB requires your clusters to serve the same content. Depending on your application, you may need:

```yaml
# Database replication between clusters
# Example: PostgreSQL streaming replication
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: data
data:
  postgresql.conf: |
    wal_level = replica
    max_wal_senders = 5
    wal_keep_size = 1GB
    hot_standby = on
  pg_hba.conf: |
    host replication replicator 10.0.0.0/8 md5
    host replication replicator 203.0.113.0/24 md5
```

## Testing GSLB

Verify traffic is being routed correctly:

```bash
# Test from different DNS resolvers to simulate geo-location
echo "US resolver:"
dig +short app.example.com @8.8.8.8

echo "EU resolver:"
dig +short app.example.com @1.1.1.1

# Test failover by stopping health endpoint in one cluster
kubectl --context eu-cluster scale deployment gslb-health --replicas=0 -n monitoring

# Wait for health check to fail (depends on your check interval)
sleep 60

# Verify traffic shifted to other clusters
dig +short app.example.com
```

## Wrapping Up

Global Server Load Balancing for Talos Linux clusters ensures your users reach the closest, healthiest cluster no matter where they are. DNS-based GSLB through providers like Route53 or Cloudflare is the simplest approach for most teams. For a Kubernetes-native solution, k8gb gives you GSLB managed through familiar Kubernetes resources. Whichever approach you choose, invest in thorough health checks and regular failover testing to make sure your GSLB actually works when you need it.
