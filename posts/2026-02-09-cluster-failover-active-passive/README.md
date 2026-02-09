# How to Implement Cluster-Aware Failover with Active-Passive Multi-Cluster Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, High Availability, Disaster Recovery, Multi-Cluster, Failover

Description: Learn how to configure active-passive failover between Kubernetes clusters for disaster recovery, ensuring business continuity with automated cluster failover mechanisms.

---

Active-passive failover provides a proven disaster recovery strategy for critical applications. In this architecture, one Kubernetes cluster serves all production traffic (active) while another cluster remains ready to take over immediately if the active cluster fails (passive). This approach prioritizes consistency and simplicity over geographic distribution.

In this guide, you'll learn how to implement robust active-passive failover for Kubernetes, including automated health checks, traffic switching, and data replication strategies.

## Understanding Active-Passive Architecture

Unlike active-active setups where multiple clusters serve traffic simultaneously, active-passive maintains one primary cluster handling all requests. The passive cluster stays synchronized but doesn't serve production traffic until failover occurs.

This approach offers several advantages. You avoid the complexity of distributed data consistency across multiple active clusters. Testing becomes simpler because you have an exact replica of your production environment. Cost optimization is easier since the passive cluster can run with reduced capacity and scale up only during failover.

The trade-off is that you're not utilizing the passive cluster's resources during normal operation, and failover introduces a brief service interruption while traffic switches over.

## Setting Up Infrastructure for Active-Passive

Start by provisioning two identical Kubernetes clusters. They should have the same node pools, storage configurations, and network settings to ensure workloads behave identically.

```bash
# Create active cluster (us-east-1)
gcloud container clusters create production-active \
  --region us-east1 \
  --num-nodes 5 \
  --machine-type n2-standard-4 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --labels role=active,env=production

# Create passive cluster (us-west-1)
gcloud container clusters create production-passive \
  --region us-west1 \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --labels role=passive,env=production
```

Notice the passive cluster starts with fewer nodes to save costs. It will scale up automatically during failover.

## DNS-Based Failover Configuration

DNS provides the simplest mechanism for directing traffic between active and passive clusters. Configure DNS with health checks that automatically switch to the passive cluster when the active cluster becomes unhealthy.

Create health check endpoints in both clusters:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: health-check
  namespace: default
  annotations:
    cloud.google.com/neg: '{"exposed_ports": {"80":{"name": "health-check-neg"}}}'
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
    name: http
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
      - name: health
        image: hashicorp/http-echo:latest
        args:
        - "-text=healthy"
        - "-listen=:8080"
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

Configure Route53 health checks and failover routing:

```json
{
  "HealthCheckConfig": {
    "Type": "HTTPS",
    "ResourcePath": "/health",
    "FullyQualifiedDomainName": "active.example.com",
    "Port": 443,
    "RequestInterval": 30,
    "FailureThreshold": 3,
    "MeasureLatency": true,
    "EnableSNI": true
  }
}
```

Create the failover DNS record set:

```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "active-cluster",
        "Failover": "PRIMARY",
        "HealthCheckId": "health-check-id",
        "AliasTarget": {
          "HostedZoneId": "Z1234567890ABC",
          "DNSName": "active-lb.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "passive-cluster",
        "Failover": "SECONDARY",
        "AliasTarget": {
          "HostedZoneId": "Z0987654321XYZ",
          "DNSName": "passive-lb.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

When health checks fail on the active cluster, Route53 automatically begins resolving app.example.com to the passive cluster's load balancer.

## Application State Replication

For stateful applications, you need to replicate data from the active to passive cluster. The approach varies based on your storage backend.

For PostgreSQL databases, configure streaming replication:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: database
data:
  postgresql.conf: |
    # Primary (active cluster)
    wal_level = replica
    max_wal_senders = 10
    max_replication_slots = 10
    synchronous_commit = remote_apply
    synchronous_standby_names = 'passive_replica'

  recovery.conf: |
    # Standby (passive cluster)
    standby_mode = on
    primary_conninfo = 'host=active-db.example.com port=5432 user=replicator'
    primary_slot_name = 'passive_replica'
    trigger_file = '/tmp/promote_to_primary'
```

For stateless applications with external state stores, ensure both clusters can access the same storage:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: shared-storage
spec:
  capacity:
    storage: 100Gi
  accessModes:
  - ReadWriteMany
  csi:
    driver: pd.csi.storage.gke.io
    volumeHandle: projects/my-project/zones/us-central1-a/disks/shared-disk
    readOnly: false
```

## Automated Failover Controller

Build a failover controller that monitors cluster health and triggers failover when necessary:

```python
# failover-controller.py
import time
import requests
from kubernetes import client, config
import boto3

class FailoverController:
    def __init__(self):
        self.route53 = boto3.client('route53')
        self.active_endpoint = 'https://active.example.com/health'
        self.passive_endpoint = 'https://passive.example.com/health'
        self.failure_threshold = 3
        self.failure_count = 0

    def check_health(self, endpoint):
        """Check if cluster is healthy"""
        try:
            response = requests.get(endpoint, timeout=5)
            return response.status_code == 200
        except Exception as e:
            print(f"Health check failed: {e}")
            return False

    def trigger_failover(self):
        """Trigger failover to passive cluster"""
        print("Triggering failover to passive cluster")

        # Scale up passive cluster
        self.scale_passive_cluster()

        # Update DNS to point to passive
        self.update_dns_failover()

        # Promote passive database to primary
        self.promote_database()

        # Send notifications
        self.notify_team("Failover completed to passive cluster")

    def scale_passive_cluster(self):
        """Scale passive cluster to active capacity"""
        # Use cluster autoscaler or node pool scaling
        print("Scaling passive cluster to production capacity")
        # Implementation depends on cloud provider

    def promote_database(self):
        """Promote passive database to primary"""
        # Create trigger file for PostgreSQL promotion
        config.load_kube_config(context='passive-cluster')
        v1 = client.CoreV1Api()

        # Execute promotion command in database pod
        command = ['touch', '/tmp/promote_to_primary']
        # Execute command in pod
        print("Promoting passive database to primary")

    def update_dns_failover(self):
        """Manually trigger DNS failover"""
        # Update Route53 health check to force failover
        response = self.route53.change_resource_record_sets(
            HostedZoneId='Z1234567890ABC',
            ChangeBatch={
                'Changes': [{
                    'Action': 'UPSERT',
                    'ResourceRecordSet': {
                        'Name': 'app.example.com',
                        'Type': 'A',
                        'SetIdentifier': 'passive-cluster',
                        'Failover': 'PRIMARY',
                        'TTL': 60,
                        'ResourceRecords': [{'Value': 'passive-lb-ip'}]
                    }
                }]
            }
        )
        print(f"DNS failover triggered: {response}")

    def notify_team(self, message):
        """Send notification about failover"""
        # Integrate with Slack, PagerDuty, etc.
        print(f"Notification: {message}")

    def run(self):
        """Main monitoring loop"""
        while True:
            if self.check_health(self.active_endpoint):
                self.failure_count = 0
                print("Active cluster healthy")
            else:
                self.failure_count += 1
                print(f"Active cluster unhealthy ({self.failure_count}/{self.failure_threshold})")

                if self.failure_count >= self.failure_threshold:
                    self.trigger_failover()
                    break

            time.sleep(30)

if __name__ == '__main__':
    controller = FailoverController()
    controller.run()
```

Deploy this controller as a CronJob or external service that monitors both clusters.

## Configuration Synchronization

Keep configurations synchronized between active and passive clusters using GitOps:

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app-active
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/k8s-manifests
    targetRevision: main
    path: apps/production
  destination:
    server: https://active-cluster.example.com
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true

---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app-passive
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/k8s-manifests
    targetRevision: main
    path: apps/production
  destination:
    server: https://passive-cluster.example.com
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Both clusters deploy from the same Git repository, ensuring configuration consistency.

## Testing Failover

Regularly test your failover process to ensure it works during actual incidents:

```bash
#!/bin/bash
# test-failover.sh

echo "Starting failover test..."

# Step 1: Verify both clusters are healthy
echo "Checking cluster health..."
kubectl --context active-cluster get nodes
kubectl --context passive-cluster get nodes

# Step 2: Create canary deployment in passive
echo "Deploying canary to passive cluster..."
kubectl --context passive-cluster apply -f canary-deployment.yaml

# Step 3: Simulate active cluster failure
echo "Simulating active cluster failure..."
kubectl --context active-cluster scale deployment health-check --replicas=0

# Step 4: Monitor DNS propagation
echo "Monitoring DNS failover..."
watch -n 5 'dig +short app.example.com'

# Step 5: Verify passive cluster serves traffic
echo "Verifying passive cluster..."
curl https://app.example.com/health

# Step 6: Restore active cluster
echo "Restoring active cluster..."
kubectl --context active-cluster scale deployment health-check --replicas=2

echo "Failover test complete"
```

Run this test monthly during maintenance windows to validate your failover procedures.

## Failback Procedures

After resolving issues in the active cluster, plan your failback carefully:

```bash
#!/bin/bash
# failback-to-active.sh

# Step 1: Ensure active cluster is fully healthy
kubectl --context active-cluster get nodes
kubectl --context active-cluster get pods --all-namespaces

# Step 2: Sync data from passive to active
# (Database replication in reverse)

# Step 3: Update DNS to point back to active
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://failback-dns.json

# Step 4: Monitor for issues
# Watch traffic and error rates for 30 minutes

# Step 5: Scale down passive cluster
kubectl --context passive-cluster scale deployment --all --replicas=1
```

## Monitoring and Alerting

Set up comprehensive monitoring for both clusters:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-failover-alerts
  namespace: monitoring
spec:
  groups:
  - name: failover
    rules:
    - alert: ActiveClusterDown
      expr: up{cluster="active"} == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Active cluster is down"
        description: "Failover to passive may be required"

    - alert: PassiveClusterDown
      expr: up{cluster="passive"} == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Passive cluster is down"
        description: "Disaster recovery capacity compromised"
```

## Best Practices

Always maintain exact parity between active and passive clusters. Configuration drift causes unexpected behavior during failover.

Keep DNS TTL values low (60 seconds or less) for records involved in failover to minimize switchover time.

Automate failover decisions carefully. Too aggressive and you'll have false positives. Too conservative and you'll have extended outages.

Document your failover runbook thoroughly and keep it updated. During incidents, teams need clear procedures to follow.

Test failover regularly in production, not just staging environments. Real production traffic reveals issues that testing cannot simulate.

## Conclusion

Active-passive failover provides robust disaster recovery for Kubernetes applications when implemented correctly. By combining health monitoring, automated DNS failover, data replication, and regular testing, you can achieve recovery time objectives measured in minutes rather than hours.

The key to success is treating your passive cluster as production-ready at all times, maintaining synchronization diligently, and testing failover procedures regularly to build confidence in your disaster recovery capabilities.
