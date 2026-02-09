# How to Use Cluster Autoscaler Expander Strategies for Node Pool Selection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Autoscaler, Scaling

Description: Master Cluster Autoscaler expander strategies to control which node pools are scaled up when your cluster needs more capacity, optimizing for cost, performance, or availability.

---

When pods are pending due to insufficient resources, the Cluster Autoscaler adds nodes. If you have multiple node pools, expander strategies determine which pool gets new nodes. This lets you optimize for cost, performance, zone balance, or custom priorities.

## Understanding Expander Strategies

Cluster Autoscaler supports several expander strategies:

- **random**: Choose a random node pool (default)
- **most-pods**: Select pool that can schedule the most pending pods
- **least-waste**: Choose pool that will have least idle resources after scaling
- **price**: Select cheapest node pool (requires cloud provider pricing info)
- **priority**: Use priority-based selection
- **grpc**: Query external service for decision

## Configuring the Expander

Set the expander in Cluster Autoscaler deployment:

```yaml
# cluster-autoscaler-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.2
        command:
        - ./cluster-autoscaler
        - --v=4
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=priority,least-waste
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        volumeMounts:
        - name: ssl-certs
          mountPath: /etc/ssl/certs/ca-certificates.crt
          readOnly: true
        - name: expander-config
          mountPath: /etc/config
      volumes:
      - name: ssl-certs
        hostPath:
          path: /etc/ssl/certs/ca-bundle.crt
      - name: expander-config
        configMap:
          name: cluster-autoscaler-priority-expander
```

## Priority Expander

Define node pool priorities:

```yaml
# priority-expander-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |-
    10:
      - .*-spot-.*
    5:
      - .*-on-demand-.*
    1:
      - .*-expensive-.*
```

This configuration:
- Prioritizes spot instance pools (priority 10)
- Falls back to on-demand pools (priority 5)
- Uses expensive pools as last resort (priority 1)

## Cost-Optimized Strategy

Prefer cheaper node pools:

```yaml
# cost-optimized-expander.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |-
    10:
      - .*t3\.medium.*spot.*
      - .*t3a\.medium.*spot.*
    8:
      - .*t3\.large.*spot.*
      - .*t3a\.large.*spot.*
    5:
      - .*t3\.medium.*on-demand.*
      - .*t3a\.medium.*on-demand.*
    3:
      - .*c5\..*on-demand.*
    1:
      - .*r5\..*on-demand.*
```

## Zone-Balanced Strategy

Ensure balanced scaling across zones:

```bash
# Configure autoscaler for zone balance
kubectl patch deployment cluster-autoscaler -n kube-system --type=json -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/command/-",
    "value": "--balance-similar-node-groups=true"
  },
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/command/-",
    "value": "--expander=least-waste"
  }
]'
```

## Performance-Optimized Strategy

Prioritize high-performance node pools:

```yaml
# performance-expander.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |-
    10:
      - .*c5\..*         # Compute optimized
      - .*c6i\..*
    8:
      - .*m5\..*         # General purpose
      - .*m6i\..*
    5:
      - .*t3\..*         # Burstable
    1:
      - .*a1\..*         # ARM-based (lowest priority)
```

## GPU Workload Strategy

Prefer GPU pools for ML workloads:

```yaml
# gpu-priority-expander.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |-
    10:
      - .*-gpu-a100-.*    # A100 GPUs highest priority
    8:
      - .*-gpu-v100-.*    # V100 GPUs
    6:
      - .*-gpu-t4-.*      # T4 GPUs
    4:
      - .*-cpu-.*         # CPU-only pools lower priority
```

## Mixed Strategy with Fallback

Combine multiple expanders:

```bash
# Use priority first, then least-waste as fallback
--expander=priority,least-waste
```

The autoscaler will:
1. Try priority expander first
2. If multiple pools have same priority, use least-waste to choose
3. If least-waste can't decide, fall back to random

## Most-Pods Expander

Maximize pod scheduling efficiency:

```yaml
# Update autoscaler to use most-pods
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --expander=most-pods
        - --max-node-provision-time=15m
```

This selects the node pool that can schedule the most pending pods, reducing overall scaling operations.

## Custom GRPC Expander

Implement custom scaling logic:

```yaml
# grpc-expander-config.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --expander=grpc
        - --grpc-expander-url=expander-service.kube-system:9090
---
apiVersion: v1
kind: Service
metadata:
  name: expander-service
  namespace: kube-system
spec:
  selector:
    app: custom-expander
  ports:
  - port: 9090
    protocol: TCP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-expander
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: custom-expander
  template:
    metadata:
      labels:
        app: custom-expander
    spec:
      containers:
      - name: expander
        image: custom-expander:v1.0
        ports:
        - containerPort: 9090
        env:
        - name: COST_API_ENDPOINT
          value: "https://cost-api.example.com"
        - name: UTILIZATION_THRESHOLD
          value: "0.7"
```

## Time-Based Strategies

Switch strategies based on time:

```bash
#!/bin/bash
# dynamic-expander.sh

HOUR=$(date +%H)

if [ $HOUR -ge 9 ] && [ $HOUR -le 17 ]; then
  # Business hours: prioritize performance
  PRIORITIES="10:\n  - .*c5\..*\n5:\n  - .*t3\..*"
else
  # Off-hours: prioritize cost
  PRIORITIES="10:\n  - .*-spot-.*\n5:\n  - .*t3\..*"
fi

kubectl create configmap cluster-autoscaler-priority-expander \
  --from-literal=priorities="$PRIORITIES" \
  -n kube-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart autoscaler to pick up new config
kubectl rollout restart deployment cluster-autoscaler -n kube-system
```

Run this as a CronJob:

```yaml
# expander-scheduler.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: expander-scheduler
  namespace: kube-system
spec:
  schedule: "0 9,17 * * *"  # 9 AM and 5 PM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: expander-scheduler
          containers:
          - name: updater
            image: bitnami/kubectl:latest
            command: ["/scripts/dynamic-expander.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: expander-scripts
              defaultMode: 0755
          restartPolicy: OnFailure
```

## Monitoring Expander Decisions

Track which pools are being scaled:

```bash
# View autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler --tail=100

# Look for expander decisions
kubectl logs -n kube-system deployment/cluster-autoscaler | grep -i expander

# Count scale-up events by node group
kubectl get events -n kube-system --field-selector source=cluster-autoscaler -o json | \
  jq -r '.items[] | select(.reason=="TriggeredScaleUp") | .message' | \
  grep -oP 'node group: \K[^ ]+' | sort | uniq -c
```

## Prometheus Metrics

Monitor autoscaler performance:

```promql
# Scale-up events by node group
rate(cluster_autoscaler_scaled_up_nodes_total[5m])

# Failed scale-up attempts
rate(cluster_autoscaler_failed_scale_ups_total[5m])

# Current node count by node group
cluster_autoscaler_nodes_count

# Pending pods triggering scale-up
cluster_autoscaler_unschedulable_pods_count
```

## Testing Expander Strategies

Simulate scaling scenarios:

```bash
# Create a large deployment to trigger scaling
kubectl create deployment test-scaling \
  --image=nginx:1.21 \
  --replicas=100 \
  -- /bin/sh -c "sleep 3600"

# Set resource requests to trigger scaling
kubectl set resources deployment test-scaling \
  --requests=cpu=1000m,memory=2Gi

# Watch which node pools scale
watch 'kubectl get nodes -o wide'

# Monitor autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler -f

# Clean up
kubectl delete deployment test-scaling
```

## Best Practices

1. **Start with Priority**: Priority expander is most flexible
2. **Use Fallbacks**: Combine expanders (priority,least-waste,random)
3. **Test Thoroughly**: Validate scaling behavior under load
4. **Monitor Costs**: Track actual costs vs expected
5. **Balance Zones**: Use balance-similar-node-groups for HA
6. **Document Priorities**: Maintain clear documentation of pool priorities
7. **Review Regularly**: Adjust priorities as pricing and workloads change
8. **Set Limits**: Configure max nodes per pool to prevent runaway scaling

## Troubleshooting

If autoscaler isn't scaling preferred pools:

```bash
# Check expander configuration
kubectl get configmap cluster-autoscaler-priority-expander -n kube-system -o yaml

# Verify autoscaler is using the config
kubectl logs -n kube-system deployment/cluster-autoscaler | grep -i "priority expander"

# Check if node groups match regex patterns
kubectl get nodes --show-labels | grep -E "spot|on-demand"

# View current autoscaler configuration
kubectl describe deployment cluster-autoscaler -n kube-system | grep -A 20 "Command"

# Check for errors
kubectl logs -n kube-system deployment/cluster-autoscaler | grep -i error
```

Cluster Autoscaler expander strategies give you fine-grained control over which node pools scale when your cluster needs capacity. By choosing the right strategy or combination of strategies, you can optimize for cost, performance, availability, or custom business requirements.

