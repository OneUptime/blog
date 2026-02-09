# How to Set Up Scheduled Node Pool Scaling for Kubernetes Non-Production Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Node Pools, Scheduled Scaling, FinOps

Description: Implement automated scheduled scaling for non-production Kubernetes node pools to scale down during off-hours and weekends, achieving 60-70% cost reduction on development and staging environments.

---

Non-production environments often run 24/7 despite only being used during business hours. Scheduled node pool scaling automatically scales down dev and staging clusters outside working hours, dramatically reducing costs. This guide shows you how to implement time-based scaling for non-production environments.

## Calculating Non-Production Waste

Development and staging environments typically operate:
- 40 hours/week during business hours
- 128 hours/week remaining (76% waste)

Scheduled scaling during off-hours recovers this waste.

## Implementing CronJob-Based Scaling

Create scale-down and scale-up CronJobs:

```yaml
# scale-down-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-dev
  namespace: kube-system
spec:
  schedule: "0 18 * * 1-5"  # 6 PM Mon-Fri
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: node-scaler
          containers:
          - name: scaler
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Scale deployments to minimal replicas
              kubectl scale deployment --all --replicas=1 -n development
              kubectl scale deployment --all --replicas=1 -n staging

              # Scale node pools (AWS example)
              aws autoscaling update-auto-scaling-group \
                --auto-scaling-group-name dev-node-pool \
                --min-size 1 --max-size 1 --desired-capacity 1
          restartPolicy: OnFailure
---
# scale-up-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-dev
  namespace: kube-system
spec:
  schedule: "0 7 * * 1-5"  # 7 AM Mon-Fri
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: node-scaler
          containers:
          - name: scaler
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Scale node pools up first
              aws autoscaling update-auto-scaling-group \
                --auto-scaling-group-name dev-node-pool \
                --min-size 3 --max-size 10 --desired-capacity 3

              # Wait for nodes
              sleep 60

              # Scale deployments back up
              kubectl scale deployment api --replicas=3 -n development
              kubectl scale deployment frontend --replicas=2 -n development
          restartPolicy: OnFailure
```

Create RBAC for scaling:

```yaml
# scaler-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: node-scaler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-scaler
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "patch", "update"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-scaler
subjects:
- kind: ServiceAccount
  name: node-scaler
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: node-scaler
  apiGroup: rbac.authorization.k8s.io
```

## Using Keda for Advanced Scheduling

Deploy KEDA for cron-based scaling:

```yaml
# scaledobject-scheduled.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: dev-environment-scaler
  namespace: development
spec:
  scaleTargetRef:
    name: api-deployment
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 7 * * 1-5      # Scale up at 7 AM weekdays
      end: 0 18 * * 1-5        # Scale down at 6 PM weekdays
      desiredReplicas: "5"
```

## Weekend Shutdown

Completely shutdown non-critical environments on weekends:

```yaml
# weekend-shutdown-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekend-shutdown
  namespace: kube-system
spec:
  schedule: "0 18 * * 5"  # Friday 6 PM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: node-scaler
          containers:
          - name: shutdown
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Scale all deployments to 0
              for ns in development staging; do
                kubectl scale deployment --all --replicas=0 -n $ns
              done

              # Scale node pools to minimum
              aws autoscaling update-auto-scaling-group \
                --auto-scaling-group-name dev-node-pool \
                --min-size 0 --max-size 0 --desired-capacity 0

              echo "Weekend shutdown completed"
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monday-startup
  namespace: kube-system
spec:
  schedule: "0 7 * * 1"  # Monday 7 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: node-scaler
          containers:
          - name: startup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Restore node pools
              aws autoscaling update-auto-scaling-group \
                --auto-scaling-group-name dev-node-pool \
                --min-size 3 --max-size 10 --desired-capacity 3

              sleep 120

              # Restore deployments from ConfigMap
              kubectl apply -f /config/dev-deployments.yaml

              echo "Monday startup completed"
          restartPolicy: OnFailure
```

## Monitoring Scheduled Scaling

Track scaling operations:

```bash
# View CronJob history
kubectl get jobs -n kube-system | grep scale

# Check logs
kubectl logs -n kube-system job/scale-down-dev-28472920
```

Calculate savings:

```python
#!/usr/bin/env python3
# calculate-scheduled-savings.py

# Business hours: 8 AM - 6 PM Mon-Fri = 50 hours/week
# Total hours/week = 168
# Off-hours = 118 hours/week (70%)

HOURLY_COST = 5.00  # Cost per hour for dev cluster
BUSINESS_HOURS_PER_WEEK = 50
TOTAL_HOURS_PER_WEEK = 168

off_hours = TOTAL_HOURS_PER_WEEK - BUSINESS_HOURS_PER_WEEK
weekly_savings = off_hours * HOURLY_COST
monthly_savings = weekly_savings * 4.33
annual_savings = monthly_savings * 12

print(f"Weekly savings: ${weekly_savings:.2f}")
print(f"Monthly savings: ${monthly_savings:.2f}")
print(f"Annual savings: ${annual_savings:.2f}")
print(f"Savings percentage: {(off_hours/TOTAL_HOURS_PER_WEEK)*100:.1f}%")
```

## Best Practices

Label environments appropriately:

```yaml
metadata:
  labels:
    environment: development
    auto-scale: "true"
    business-hours-only: "true"
```

Exclude critical services:

```yaml
metadata:
  labels:
    environment: development
    auto-scale: "false"  # Exclude from scheduled scaling
    critical: "true"
```

## Conclusion

Scheduled node pool scaling for non-production environments typically achieves 60-70% cost reduction by automatically scaling down during off-hours and weekends. This simple automation requires minimal setup but delivers significant savings, making it one of the highest-ROI cost optimization strategies for Kubernetes.
