# How to Implement Canary Node Pool Upgrades for Risk Mitigation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Canary, Node-Pools

Description: Implement canary node pool upgrade strategies to test Kubernetes version changes on a subset of nodes before rolling out cluster-wide, minimizing risk and enabling fast rollback if issues arise.

---

Canary node pool upgrades let you test new Kubernetes versions on a small subset of nodes before upgrading your entire cluster. This approach significantly reduces risk by exposing only a fraction of your workload to potential upgrade issues while providing real production validation.

## Understanding Canary Upgrades

A canary upgrade involves creating a new node pool with the target Kubernetes version alongside your existing pool. You gradually shift workloads to the canary pool, monitor for issues, and only proceed with full upgrade after validating the canary succeeds. If problems arise, you can quickly shift workloads back to the stable pool.

This strategy is particularly valuable for large production clusters where the cost of a failed upgrade is high. You get real production testing without risking your entire workload.

## Creating a Canary Node Pool

Start by creating a small canary node pool with the target version.

```bash
#!/bin/bash
# create-canary-pool-eks.sh

CLUSTER_NAME="production"
CANARY_POOL="canary-1-29"
STABLE_POOL="stable-1-28"
TARGET_VERSION="1.29"

echo "Creating canary node pool with version $TARGET_VERSION..."

# Create canary node group
aws eks create-nodegroup \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $CANARY_POOL \
  --node-role arn:aws:iam::123456789012:role/eks-node-role \
  --subnets subnet-abc123 subnet-def456 \
  --instance-types t3.large \
  --scaling-config minSize=2,maxSize=5,desiredSize=2 \
  --kubernetes-version $TARGET_VERSION \
  --labels canary=true,version=1.29

# Wait for canary pool to be ready
aws eks wait nodegroup-active \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $CANARY_POOL

echo "Canary node pool created and ready"
```

For GKE:

```bash
#!/bin/bash
# create-canary-pool-gke.sh

CLUSTER_NAME="production"
ZONE="us-central1-a"
CANARY_POOL="canary-pool"
TARGET_VERSION="1.29.0-gke.1234"

gcloud container node-pools create $CANARY_POOL \
  --cluster=$CLUSTER_NAME \
  --zone=$ZONE \
  --node-version=$TARGET_VERSION \
  --machine-type=n1-standard-4 \
  --num-nodes=2 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=5 \
  --node-labels=canary=true,version=1-29

echo "Canary pool created"
```

## Directing Traffic to Canary Nodes

Use node selectors and taints to control which pods run on canary nodes.

```yaml
# canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-canary
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
      track: canary
  template:
    metadata:
      labels:
        app: web-app
        track: canary
    spec:
      nodeSelector:
        canary: "true"
      containers:
      - name: web
        image: myapp:latest
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

Gradually increase canary traffic:

```bash
#!/bin/bash
# increase-canary-traffic.sh

CANARY_REPLICAS=2
STABLE_REPLICAS=8

echo "Current distribution: $CANARY_REPLICAS canary, $STABLE_REPLICAS stable"

# Increase canary gradually
for canary in 2 5 10 20; do
  stable=$((100 - canary))

  echo "Shifting to $canary% canary, $stable% stable..."

  kubectl scale deployment web-app-canary -n production --replicas=$canary
  kubectl scale deployment web-app-stable -n production --replicas=$stable

  echo "Monitoring for 15 minutes..."
  sleep 900

  # Check for issues
  errors=$(kubectl logs -n production -l track=canary --tail=100 | grep -c ERROR)

  if [ $errors -gt 10 ]; then
    echo "ERROR: High error rate on canary, rolling back"
    kubectl scale deployment web-app-canary -n production --replicas=0
    kubectl scale deployment web-app-stable -n production --replicas=10
    exit 1
  fi
done

echo "Canary validation successful"
```

## Monitoring Canary Performance

Compare canary node performance against stable nodes.

```bash
#!/bin/bash
# monitor-canary-performance.sh

echo "Monitoring canary vs stable performance..."

while true; do
  echo "========================================  echo "Canary Performance Report - $(date)"
  echo "========================================"

  # Compare pod health
  canary_pods=$(kubectl get pods -n production -l track=canary --field-selector status.phase=Running --no-headers | wc -l)
  stable_pods=$(kubectl get pods -n production -l track=stable --field-selector status.phase=Running --no-headers | wc -l)

  echo "Running pods: Canary=$canary_pods, Stable=$stable_pods"

  # Compare resource usage
  echo "Resource usage:"
  kubectl top pods -n production -l track=canary --no-headers | \
    awk '{cpu+=$2; mem+=$3} END {print "Canary avg: CPU=" cpu/NR "m, Memory=" mem/NR "Mi"}'

  kubectl top pods -n production -l track=stable --no-headers | \
    awk '{cpu+=$2; mem+=$3} END {print "Stable avg: CPU=" cpu/NR "m, Memory=" mem/NR "Mi"}'

  # Compare error rates
  canary_errors=$(kubectl logs -n production -l track=canary --tail=1000 --since=5m | grep -c ERROR)
  stable_errors=$(kubectl logs -n production -l track=stable --tail=1000 --since=5m | grep -c ERROR)

  echo "Error rates: Canary=$canary_errors, Stable=$stable_errors"

  # Decision point
  error_ratio=$(echo "scale=2; $canary_errors / $stable_errors" | bc)

  if (( $(echo "$error_ratio > 1.5" | bc -l) )); then
    echo "WARNING: Canary error rate significantly higher than stable"
  fi

  sleep 300
done
```

## Automated Canary Analysis

Implement automated canary analysis to detect issues.

```bash
#!/bin/bash
# automated-canary-analysis.sh

ANALYSIS_DURATION=3600  # 1 hour
THRESHOLD_ERROR_RATE=0.05  # 5%
THRESHOLD_LATENCY_P99=1000  # 1 second

echo "Starting automated canary analysis..."

start_time=$(date +%s)

while [ $(($(date +%s) - start_time)) -lt $ANALYSIS_DURATION ]; do
  # Collect metrics
  canary_requests=$(kubectl logs -n production -l track=canary --tail=1000 | grep "HTTP" | wc -l)
  canary_errors=$(kubectl logs -n production -l track=canary --tail=1000 | grep "HTTP.*[45][0-9][0-9]" | wc -l)

  stable_requests=$(kubectl logs -n production -l track=stable --tail=1000 | grep "HTTP" | wc -l)
  stable_errors=$(kubectl logs -n production -l track=stable --tail=1000 | grep "HTTP.*[45][0-9][0-9]" | wc -l)

  # Calculate error rates
  canary_error_rate=$(echo "scale=4; $canary_errors / $canary_requests" | bc)
  stable_error_rate=$(echo "scale=4; $stable_errors / $stable_requests" | bc)

  echo "$(date): Canary error rate: $canary_error_rate, Stable: $stable_error_rate"

  # Check if canary exceeds threshold
  if (( $(echo "$canary_error_rate > $stable_error_rate * 2" | bc -l) )); then
    echo "FAIL: Canary error rate too high, aborting"
    exit 1
  fi

  sleep 60
done

echo "PASS: Canary analysis successful"
```

## Rolling Back Canary

If canary validation fails, quickly roll back.

```bash
#!/bin/bash
# rollback-canary.sh

CLUSTER_NAME="production"
CANARY_POOL="canary-1-29"

echo "Rolling back canary deployment..."

# Scale down canary deployments
kubectl scale deployment -n production -l track=canary --replicas=0

# Scale up stable deployments
kubectl scale deployment -n production -l track=stable --replicas=10

# Cordon canary nodes
kubectl get nodes -l canary=true -o name | \
  xargs -I {} kubectl cordon {}

# Delete canary node pool
aws eks delete-nodegroup \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $CANARY_POOL

echo "Canary rolled back successfully"
```

## Promoting Canary to Production

Once canary validation succeeds, promote it to production.

```bash
#!/bin/bash
# promote-canary.sh

CLUSTER_NAME="production"
OLD_POOL="stable-1-28"
CANARY_POOL="canary-1-29"

echo "Promoting canary to production..."

# Gradually shift all traffic to canary
for percent in 25 50 75 100; do
  canary_size=$((percent / 5))
  stable_size=$(((100 - percent) / 5))

  echo "Shifting to $percent% canary..."

  # Scale canary node pool
  aws eks update-nodegroup-config \
    --cluster-name $CLUSTER_NAME \
    --nodegroup-name $CANARY_POOL \
    --scaling-config desiredSize=$canary_size

  # Wait and monitor
  sleep 600
done

# Delete old stable pool
echo "Removing old stable pool..."
kubectl cordon -l nodepool=$OLD_POOL
kubectl drain -l nodepool=$OLD_POOL --ignore-daemonsets --delete-emptydir-data

aws eks delete-nodegroup \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $OLD_POOL

# Rename canary to stable
aws eks update-nodegroup-config \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $CANARY_POOL \
  --labels stable=true,canary-

echo "Canary promoted to production successfully"
```

## Best Practices

Start canary with minimal traffic, typically 5-10 percent. Monitor canary for extended periods before increasing traffic. Use automated analysis to detect issues objectively. Have clear rollback criteria and procedures. Document findings from each canary deployment. Never skip canary testing for major version upgrades.

Canary node pool upgrades provide a safety net for Kubernetes version changes by allowing you to validate upgrades with real production traffic on a small scale before committing to a full cluster upgrade. This approach significantly reduces risk while maintaining confidence in your upgrade process.
