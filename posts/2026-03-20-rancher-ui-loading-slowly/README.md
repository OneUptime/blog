# How to Troubleshoot Rancher UI Loading Slowly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Troubleshooting, Performance, UI

Description: Identify and resolve the causes of slow Rancher UI performance, including database bottlenecks, resource exhaustion, and large cluster inventories.

## Introduction

A slow Rancher UI is frustrating and can impede DevOps workflows. Slowness can stem from server-side issues (database latency, CPU/memory pressure), network issues (high latency between browser and Rancher), or client-side issues (large numbers of resources being fetched). This guide covers how to profile and fix each type of slowness.

## Step 1: Determine Where the Slowness Originates

Use browser DevTools to profile the initial load:

1. Open DevTools (`F12`) → **Network** tab.
2. Reload the Rancher UI.
3. Look for requests that take more than 1 second.

Key requests to watch:

| Request Pattern | What It Indicates |
|---|---|
| `/v3/clusters` taking > 2s | Database or cluster enumeration slowness |
| `/v1/management.cattle.io.settings` stalling | Rancher server CPU pressure |
| WebSocket connection delay | Network latency or server overload |
| Static assets (JS/CSS) slow | CDN or reverse proxy issue |

## Step 2: Check Rancher Server Resource Usage

```bash
# Check Rancher pod CPU and memory consumption

kubectl top pod -n cattle-system -l app=rancher

# Check node pressure
kubectl top node

# If Rancher is CPU-throttled, inspect the resource limits
kubectl get deployment -n cattle-system rancher -o json \
  | jq '.spec.template.spec.containers[].resources'

# Increase CPU and memory requests/limits if needed
kubectl set resources deployment rancher -n cattle-system \
  --requests=cpu=500m,memory=1Gi \
  --limits=cpu=2000m,memory=4Gi
```

## Step 3: Check the Management Cluster Datastore

For Rancher running on a K3s management cluster backed by an external MySQL datastore:

```bash
# Check MySQL query performance (run inside MySQL)
mysql -h <db-host> -u <db-user> -p<password> <database-name> << 'EOF'
-- Check for slow queries
SHOW PROCESSLIST;

-- Check table sizes (large tables slow down queries)
SELECT table_name, ROUND(data_length/1024/1024, 2) AS data_mb,
       ROUND(index_length/1024/1024, 2) AS index_mb
FROM information_schema.tables
WHERE table_schema = '<database-name>'
ORDER BY data_mb DESC LIMIT 10;
EOF

# For single-server K3s (default embedded SQLite), check datastore size
du -sh /var/lib/rancher/k3s/server/db/
```

## Step 4: Prune Stale Resources

Large numbers of stale Kubernetes resources slow down list API calls:

```bash
# Count events cluster-wide
kubectl get events -A --no-headers | wc -l
# By default, kube-apiserver retains events for 1 hour

# Check the number of ConfigMaps and Secrets (often bloated by Helm releases)
kubectl get configmap -A --no-headers | wc -l
kubectl get secret -A --no-headers | wc -l

# List Helm release secrets to gauge Helm history bloat (showing first 20)
kubectl get secrets -A -o json \
  | jq -r '.items[] | select(.type=="helm.sh/release.v1") | "\(.metadata.namespace) \(.metadata.name)"' \
  | head -20

# Prune completed Jobs
kubectl delete jobs -A --field-selector status.successful=1
```

## Step 5: Check the Number of Managed Clusters and Resources

```bash
# Count registered clusters
kubectl get clusters.management.cattle.io --no-headers | wc -l

# Large numbers of clusters increase the UI load time significantly
# Consider whether all clusters need to be in one Rancher instance

# Check how many custom resources Rancher is tracking
kubectl get crds | grep cattle.io | wc -l
```

## Step 6: Optimize the Ingress / Reverse Proxy

```bash
# If Rancher is behind a reverse proxy (e.g., nginx), check:
# 1. WebSocket support is enabled
# 2. The proxy passes the Host and X-Forwarded-* headers Rancher expects
# 3. Timeouts are set high enough

# Example nginx configuration for Rancher
cat << 'EOF'
upstream rancher {
    server rancher-server:80;
}

map $http_upgrade $connection_upgrade {
    default Upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name rancher.example.com;
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_set_header   Host $host;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Port $server_port;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass         http://rancher;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;   # WebSocket support
        proxy_set_header   Connection $connection_upgrade;
        proxy_read_timeout 900s;                    # Long timeout for WS
        proxy_buffering    off;                     # Disable buffering for WS
    }
}

server {
    listen 80;
    server_name rancher.example.com;
    return 301 https://$server_name$request_uri;
}
EOF
```

## Step 7: Enable HTTP/2

Ensure your ingress or load balancer is using HTTP/2, which significantly reduces UI load time by multiplexing requests:

```yaml
# ingress-nginx uses a controller ConfigMap setting for HTTP/2
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  use-http2: "true"
```

## Conclusion

Slow Rancher UI performance is usually attributable to insufficient server resources, database bottlenecks, or a large number of managed clusters and Kubernetes resources. Profile the issue with browser DevTools first, then address server-side resource limits, prune stale resources, and ensure your ingress supports HTTP/2 and WebSocket connections efficiently.
