# How to Plan Kubernetes Cluster Migration with Canary Traffic Shifting Between Old and New Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Migration, Canary Deployment, Traffic Management, Service Mesh

Description: Master the art of zero-downtime Kubernetes cluster migrations using canary traffic shifting strategies to progressively move workloads between clusters with full rollback capabilities.

---

Migrating between Kubernetes clusters is one of the most critical operations in platform engineering. Whether moving to a new provider, upgrading infrastructure, or consolidating clusters, the ability to gradually shift traffic between old and new clusters provides confidence and safety. This guide explores canary migration strategies that let you test the new cluster with real production traffic before fully committing.

## Understanding Canary Cluster Migration

Traditional cluster migrations follow an all-or-nothing approach: you move everything at once and hope for the best. Canary migrations flip this model by gradually routing small percentages of traffic to the new cluster while keeping the majority on the stable old cluster.

This approach provides several advantages. You can validate the new cluster with real production traffic patterns, detect configuration issues affecting only certain user segments, and roll back instantly if problems arise. Most importantly, you maintain service availability throughout the migration.

The key components of a canary cluster migration include a global load balancer that can split traffic between clusters, synchronized deployments running in both clusters, a service mesh or ingress controller capable of fine-grained traffic control, and comprehensive monitoring to compare cluster behavior.

## Architecture Overview

A typical canary cluster migration setup looks like this:

```
                    [Global Load Balancer]
                            |
                    (Weight-based routing)
                       /          \
                  90% /            \ 10%
                     /              \
            [Old Cluster]      [New Cluster]
                  |                  |
           [Service Mesh]      [Service Mesh]
                  |                  |
           [Applications]      [Applications]
                  |                  |
           [Databases*]        [Databases*]

* Shared or replicated data layer
```

The global load balancer sits above both clusters and distributes traffic based on weights you control. As confidence grows, you gradually increase the new cluster's weight.

## Setting Up the Global Load Balancer

You need a load balancer that can route traffic across clusters. Options include cloud-native solutions like AWS Global Accelerator, GCP Traffic Director, Azure Traffic Manager, or self-hosted solutions like Cloudflare Load Balancing and F5 BIG-IP DNS.

Here's an example using AWS Route 53 weighted routing:

```yaml
# route53-weighted-routing.yaml
# This is pseudo-YAML for illustration (actual setup via AWS CLI/Console)
HostedZone: example.com
RecordSets:
  - Name: app.example.com
    Type: A
    SetIdentifier: old-cluster
    Weight: 90
    ResourceRecords:
      - old-cluster-lb.us-east-1.elb.amazonaws.com
  - Name: app.example.com
    Type: A
    SetIdentifier: new-cluster
    Weight: 10
    ResourceRecords:
      - new-cluster-lb.us-west-2.elb.amazonaws.com
```

Using Terraform to manage this configuration:

```hcl
# route53-canary.tf
resource "aws_route53_record" "old_cluster" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "old-cluster"
  weighted_routing_policy {
    weight = var.old_cluster_weight
  }

  alias {
    name                   = aws_lb.old_cluster.dns_name
    zone_id                = aws_lb.old_cluster.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "new_cluster" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "new-cluster"
  weighted_routing_policy {
    weight = var.new_cluster_weight
  }

  alias {
    name                   = aws_lb.new_cluster.dns_name
    zone_id                = aws_lb.new_cluster.zone_id
    evaluate_target_health = true
  }
}
```

You can then adjust weights using Terraform variables:

```bash
# Start with 5% to new cluster
terraform apply -var="old_cluster_weight=95" -var="new_cluster_weight=5"

# Gradually increase
terraform apply -var="old_cluster_weight=80" -var="new_cluster_weight=20"
terraform apply -var="old_cluster_weight=50" -var="new_cluster_weight=50"
```

## Synchronizing Application Deployments

Both clusters need identical application configurations. Use GitOps with tools like ArgoCD or Flux to maintain consistency:

```yaml
# argocd-application-multi-cluster.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-canary-migration
spec:
  generators:
  - list:
      elements:
      - cluster: old-cluster
        url: https://old-cluster.example.com
        values:
          environment: production-old
      - cluster: new-cluster
        url: https://new-cluster.example.com
        values:
          environment: production-new
  template:
    metadata:
      name: 'myapp-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/company/app-configs
        targetRevision: main
        path: apps/myapp
        helm:
          valueFiles:
          - values-{{values.environment}}.yaml
      destination:
        server: '{{url}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

This configuration deploys the same application to both clusters automatically, ensuring consistency throughout the migration.

## Implementing Per-Cluster Monitoring

You need visibility into both clusters to compare behavior. Deploy identical monitoring stacks to each cluster:

```yaml
# prometheus-federation.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-federation
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      external_labels:
        cluster: 'new-cluster'  # Change per cluster

    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

    # Federation from old cluster
    - job_name: 'federate-old-cluster'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
        - '{job=~".+"}'
      static_configs:
      - targets:
        - 'prometheus.old-cluster.example.com'
```

Create comparison dashboards in Grafana:

```yaml
# grafana-migration-dashboard.json (simplified)
{
  "dashboard": {
    "title": "Cluster Migration Canary Dashboard",
    "panels": [
      {
        "title": "Request Rate Comparison",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{cluster='old-cluster'}[5m]))",
            "legendFormat": "Old Cluster"
          },
          {
            "expr": "sum(rate(http_requests_total{cluster='new-cluster'}[5m]))",
            "legendFormat": "New Cluster"
          }
        ]
      },
      {
        "title": "Error Rate Comparison",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{cluster='old-cluster',status=~'5..'}[5m])) / sum(rate(http_requests_total{cluster='old-cluster'}[5m]))",
            "legendFormat": "Old Cluster Error %"
          },
          {
            "expr": "sum(rate(http_requests_total{cluster='new-cluster',status=~'5..'}[5m])) / sum(rate(http_requests_total{cluster='new-cluster'}[5m]))",
            "legendFormat": "New Cluster Error %"
          }
        ]
      }
    ]
  }
}
```

## Database Considerations

The data layer is the most critical component of cluster migrations. You have several options depending on your database technology.

For databases supporting multi-region replication like PostgreSQL with logical replication:

```sql
-- On old cluster primary
CREATE PUBLICATION migration_pub FOR ALL TABLES;

-- On new cluster replica
CREATE SUBSCRIPTION migration_sub
    CONNECTION 'host=old-cluster-db.example.com dbname=myapp user=replicator'
    PUBLICATION migration_pub;

-- Monitor replication lag
SELECT
    application_name,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

For cloud-native databases, use provider-specific replication:

```bash
# AWS RDS cross-region read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier myapp-new-cluster-replica \
  --source-db-instance-identifier myapp-old-cluster \
  --db-instance-class db.r5.xlarge \
  --region us-west-2
```

Alternatively, use external data stores like Amazon S3, Azure Blob Storage, or managed databases that both clusters can access.

## Gradual Traffic Shifting Strategy

Implement a phased approach to increase confidence at each step:

**Phase 1: Internal Traffic (Week 1)**
```bash
# Route only internal monitoring traffic
# Weight: 99% old, 1% new
terraform apply -var="old_cluster_weight=99" -var="new_cluster_weight=1"
```

**Phase 2: Canary Users (Week 2)**
```bash
# Route 5% of real users
terraform apply -var="old_cluster_weight=95" -var="new_cluster_weight=5"
```

**Phase 3: Progressive Expansion (Weeks 3-6)**
```bash
# Increase weekly based on metrics
# Week 3: 20%
terraform apply -var="old_cluster_weight=80" -var="new_cluster_weight=20"

# Week 4: 40%
terraform apply -var="old_cluster_weight=60" -var="new_cluster_weight=40"

# Week 5: 60%
terraform apply -var="old_cluster_weight=40" -var="new_cluster_weight=60"

# Week 6: 80%
terraform apply -var="old_cluster_weight=20" -var="new_cluster_weight=80"
```

**Phase 4: Full Migration (Week 7)**
```bash
# Move all traffic
terraform apply -var="old_cluster_weight=0" -var="new_cluster_weight=100"
```

## Automated Health Checks and Rollback

Implement automated monitoring that can trigger rollbacks:

```python
#!/usr/bin/env python3
# canary-monitor.py
import boto3
import requests
import time

route53 = boto3.client('route53')
HOSTED_ZONE_ID = 'Z1234567890ABC'

def get_error_rate(cluster):
    """Query Prometheus for error rate"""
    query = f'sum(rate(http_requests_total{{cluster="{cluster}",status=~"5.."}}[5m])) / sum(rate(http_requests_total{{cluster="{cluster}"}}[5m]))'
    response = requests.get(f'http://prometheus.example.com/api/v1/query?query={query}')
    result = response.json()['data']['result']
    return float(result[0]['value'][1]) if result else 0

def rollback_traffic():
    """Rollback to old cluster"""
    print("ERROR THRESHOLD EXCEEDED - Rolling back to old cluster")
    # Update Route53 weights back to old cluster
    route53.change_resource_record_sets(
        HostedZoneId=HOSTED_ZONE_ID,
        ChangeBatch={
            'Changes': [
                {
                    'Action': 'UPSERT',
                    'ResourceRecordSet': {
                        'Name': 'app.example.com',
                        'Type': 'A',
                        'SetIdentifier': 'old-cluster',
                        'Weight': 100,
                        # ... additional config
                    }
                },
                {
                    'Action': 'UPSERT',
                    'ResourceRecordSet': {
                        'Name': 'app.example.com',
                        'Type': 'A',
                        'SetIdentifier': 'new-cluster',
                        'Weight': 0,
                        # ... additional config
                    }
                }
            ]
        }
    )

def monitor_canary():
    """Continuous monitoring loop"""
    ERROR_THRESHOLD = 0.01  # 1% error rate threshold

    while True:
        old_error_rate = get_error_rate('old-cluster')
        new_error_rate = get_error_rate('new-cluster')

        print(f"Old cluster error rate: {old_error_rate:.4f}")
        print(f"New cluster error rate: {new_error_rate:.4f}")

        # If new cluster error rate is significantly higher
        if new_error_rate > old_error_rate + ERROR_THRESHOLD:
            rollback_traffic()
            break

        time.sleep(60)

if __name__ == '__main__':
    monitor_canary()
```

Run this monitoring script during the migration to automatically detect and respond to issues.

## Session Affinity Considerations

For stateful applications, ensure users stick to one cluster:

```yaml
# ingress-session-affinity.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "cluster-affinity"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "3600"
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp
            port:
              number: 80
```

This ensures that once a user lands on a cluster, they continue using that cluster for the session duration.

## Final Cutover and Decommissioning

Once the new cluster handles 100% of traffic successfully for at least a week, begin decommissioning the old cluster:

```bash
# 1. Stop accepting new traffic
terraform apply -var="old_cluster_weight=0" -var="new_cluster_weight=100"

# 2. Wait for existing sessions to drain (24 hours recommended)
sleep 86400

# 3. Scale down workloads in old cluster
kubectl scale deployment --all --replicas=0 -n production --context=old-cluster

# 4. Take final backups
velero backup create final-old-cluster-backup --include-namespaces production

# 5. Document and archive
kubectl get all --all-namespaces --context=old-cluster -o yaml > old-cluster-final-state.yaml

# 6. Destroy infrastructure
terraform destroy -target=module.old_cluster
```

## Conclusion

Canary cluster migrations provide a safe, controlled approach to moving workloads between Kubernetes clusters. By gradually shifting traffic and continuously monitoring both environments, you can detect issues early and maintain service availability throughout the process. The key is patience, thorough monitoring, and the ability to quickly roll back when needed.
