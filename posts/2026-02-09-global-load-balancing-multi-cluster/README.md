# How to Configure Global Load Balancing Across Multiple Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Load Balancing, Multi-Cluster, High Availability, Traffic Management

Description: Discover how to implement global load balancing across multiple Kubernetes clusters for improved availability, performance, and geographic distribution of traffic.

---

Running Kubernetes workloads across multiple clusters provides resilience against regional outages and enables geographic distribution of your applications. However, distributing traffic intelligently across these clusters requires global load balancing that understands cluster health, capacity, and geographic proximity.

In this guide, you'll learn practical approaches to configure global load balancing for multi-cluster Kubernetes deployments, from DNS-based solutions to sophisticated service mesh implementations.

## Why Global Load Balancing Matters

Traditional load balancing operates within a single cluster or data center. When you run multiple Kubernetes clusters across regions or cloud providers, you need load balancing that operates at a global scale.

Global load balancing provides several critical benefits. It distributes traffic based on geographic proximity, reducing latency for end users. It automatically routes traffic away from unhealthy clusters, maintaining availability during outages. It enables you to optimize costs by directing traffic to clusters with available capacity or lower operational costs.

Without global load balancing, you're forced to use static DNS configurations or manual failover processes, which create operational overhead and increase recovery time during incidents.

## Approach 1: GeoDNS with Health Checks

The simplest approach to global load balancing uses geographic DNS routing combined with health checks. Cloud providers like AWS Route53, Google Cloud DNS, and Azure Traffic Manager all support this pattern.

Here's how to configure Route53 with geolocation routing:

```yaml
# route53-config.yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ClusterEastHealthCheck:
    Type: AWS::Route53::HealthCheck
    Properties:
      HealthCheckConfig:
        Type: HTTPS
        ResourcePath: /healthz
        FullyQualifiedDomainName: cluster-east.example.com
        Port: 443
        RequestInterval: 30
        FailureThreshold: 3

  ClusterWestHealthCheck:
    Type: AWS::Route53::HealthCheck
    Properties:
      HealthCheckConfig:
        Type: HTTPS
        ResourcePath: /healthz
        FullyQualifiedDomainName: cluster-west.example.com
        Port: 443
        RequestInterval: 30
        FailureThreshold: 3

  GlobalDNS:
    Type: AWS::Route53::RecordSetGroup
    Properties:
      HostedZoneId: Z1234567890ABC
      RecordSets:
      - Name: app.example.com
        Type: A
        SetIdentifier: cluster-east
        GeoLocation:
          ContinentCode: NA
        HealthCheckId: !Ref ClusterEastHealthCheck
        AliasTarget:
          HostedZoneId: Z0987654321XYZ
          DNSName: cluster-east-lb.elb.amazonaws.com
          EvaluateTargetHealth: true
      - Name: app.example.com
        Type: A
        SetIdentifier: cluster-west
        GeoLocation:
          ContinentCode: NA
        HealthCheckId: !Ref ClusterWestHealthCheck
        AliasTarget:
          HostedZoneId: Z1122334455ABC
          DNSName: cluster-west-lb.elb.amazonaws.com
          EvaluateTargetHealth: true
```

This configuration routes North American traffic to the geographically closest healthy cluster. If health checks fail, Route53 automatically fails over to the next available cluster.

Expose health check endpoints in each cluster:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: health-check-service
  namespace: default
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8080
    protocol: TCP
  selector:
    app: health-check

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: health-check
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: health-check
  template:
    metadata:
      labels:
        app: health-check
    spec:
      containers:
      - name: health-server
        image: nginx:alpine
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Approach 2: Global Server Load Balancing with K8GB

K8GB (Kubernetes Global Balancer) provides automated DNS-based global load balancing specifically designed for Kubernetes multi-cluster environments.

Install K8GB in each cluster using Helm:

```bash
helm repo add k8gb https://www.k8gb.io
helm repo update

# Install in cluster-1
helm install k8gb k8gb/k8gb \
  --namespace k8gb \
  --create-namespace \
  --set k8gb.clusterGeoTag=us-east \
  --set k8gb.extGslbClustersGeoTags=us-west \
  --set k8gb.dnsZone=example.com

# Install in cluster-2
helm install k8gb k8gb/k8gb \
  --namespace k8gb \
  --create-namespace \
  --set k8gb.clusterGeoTag=us-west \
  --set k8gb.extGslbClustersGeoTags=us-east \
  --set k8gb.dnsZone=example.com
```

Create a Gslb resource to define global load balancing for your application:

```yaml
apiVersion: k8gb.absa.oss/v1beta1
kind: Gslb
metadata:
  name: myapp-gslb
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
              name: myapp-service
              port:
                number: 80
  strategy:
    type: roundRobin  # Options: roundRobin, failover, geoip
    splitBrainThresholdSeconds: 300
    dnsTtlSeconds: 30
```

K8GB automatically synchronizes this configuration across clusters and manages DNS records to balance traffic globally. The `splitBrainThresholdSeconds` prevents rapid DNS changes during transient failures.

## Approach 3: Istio Multi-Cluster with Locality-Based Routing

Istio service mesh provides sophisticated traffic management across clusters, including locality-aware load balancing and automatic failover.

Configure Istio for multi-cluster with locality-based routing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp-global-lb
  namespace: default
spec:
  host: myapp.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
        - from: us-east-1/*
          to:
            "us-east-1/*": 80
            "us-west-1/*": 20
        - from: us-west-1/*
          to:
            "us-west-1/*": 80
            "us-east-1/*": 20
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

This configuration keeps 80% of traffic local to each region while sending 20% to the alternate region for testing. Outlier detection automatically removes unhealthy endpoints from the load balancing pool.

Create a VirtualService for weighted routing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-global
  namespace: default
spec:
  hosts:
  - myapp.example.com
  gateways:
  - istio-system/global-gateway
  http:
  - match:
    - headers:
        region:
          exact: us-east
    route:
    - destination:
        host: myapp.default.svc.cluster.local
        subset: us-east
      weight: 100
  - route:
    - destination:
        host: myapp.default.svc.cluster.local
        subset: us-east
      weight: 50
    - destination:
        host: myapp.default.svc.cluster.local
        subset: us-west
      weight: 50
```

## Approach 4: CDN-Based Global Load Balancing

Content Delivery Networks like Cloudflare, Fastly, or cloud provider CDNs can act as global load balancers with additional caching and DDoS protection benefits.

Configure Cloudflare Load Balancing with health checks:

```javascript
// cloudflare-lb-config.js
const cloudflare = require('cloudflare');

const cf = cloudflare({
  token: process.env.CLOUDFLARE_API_TOKEN
});

// Define origin pools for each cluster
const eastPool = await cf.user.loadBalancers.pools.create({
  name: 'cluster-east-pool',
  origins: [
    {
      name: 'cluster-east-1',
      address: 'east-lb.k8s.example.com',
      enabled: true,
      weight: 1
    }
  ],
  monitor: 'health-check-monitor-id',
  notification_email: 'ops@example.com'
});

const westPool = await cf.user.loadBalancers.pools.create({
  name: 'cluster-west-pool',
  origins: [
    {
      name: 'cluster-west-1',
      address: 'west-lb.k8s.example.com',
      enabled: true,
      weight: 1
    }
  ],
  monitor: 'health-check-monitor-id',
  notification_email: 'ops@example.com'
});

// Create global load balancer
const lb = await cf.zones.loadBalancers.create('zone-id', {
  name: 'app.example.com',
  default_pools: [eastPool.id, westPool.id],
  fallback_pool: eastPool.id,
  region_pools: {
    'WNAM': [westPool.id, eastPool.id],
    'ENAM': [eastPool.id, westPool.id]
  },
  steering_policy: 'geo',
  session_affinity: 'cookie',
  ttl: 30
});
```

This configuration provides geographic routing with automatic failover and session affinity to keep users connected to the same cluster during their session.

## Monitoring and Observability

Regardless of which approach you choose, implement comprehensive monitoring to understand how traffic flows across your clusters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-global-lb
  namespace: monitoring
data:
  recording-rules.yaml: |
    groups:
    - name: global-lb-metrics
      interval: 30s
      rules:
      - record: cluster:request_rate:sum
        expr: sum(rate(http_requests_total[5m])) by (cluster)
      - record: cluster:error_rate:ratio
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) by (cluster) / sum(rate(http_requests_total[5m])) by (cluster)
      - record: cluster:latency:p99
        expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (cluster, le))
```

Create alerts for unhealthy global load balancing:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: global-lb-alerts
  namespace: monitoring
spec:
  groups:
  - name: global-lb
    rules:
    - alert: ClusterNotReceivingTraffic
      expr: cluster:request_rate:sum == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Cluster {{ $labels.cluster }} not receiving traffic"
    - alert: HighErrorRateInCluster
      expr: cluster:error_rate:ratio > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate in cluster {{ $labels.cluster }}"
```

## Best Practices

When implementing global load balancing, consider these important practices.

Start with simple geographic routing and health checks before moving to complex traffic management. Many applications don't need sophisticated load balancing algorithms.

Always implement health checks at the application level, not just infrastructure level. A cluster with healthy nodes but failing application pods should not receive traffic.

Use gradual traffic shifting when testing new clusters or deployments. Never immediately route 100% of traffic to an untested cluster.

Plan for the scenario where all clusters fail health checks. Have a static maintenance page or fallback cluster that can always serve traffic, even if degraded.

Test failover regularly in production. Scheduled failover tests reveal issues before real incidents occur.

## Conclusion

Global load balancing transforms multiple isolated Kubernetes clusters into a cohesive distributed platform. Whether you choose DNS-based routing, specialized tools like K8GB, service mesh solutions like Istio, or CDN-based load balancing, the key is matching your solution to your actual traffic patterns and availability requirements.

Start with simple approaches and add sophistication as your requirements grow. Monitor traffic distribution carefully and test failover scenarios regularly to ensure your global load balancing actually works when you need it most.
