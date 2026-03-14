# Automating Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Scaling, Automation, Hard Way

Description: Build a CronJob-based automation that monitors cluster node count and adjusts the Typha replica count automatically - without the Calico Operator - following the recommended 1 Typha pod per 200...

---

## Introduction

In a large cluster, the right number of Typha replicas is not static. As you add node pools for batch jobs, scale up for peak traffic, or decommission old nodes, the optimal Typha replica count changes. Doing this manually is error-prone and easy to forget.

This post builds a Kubernetes CronJob that periodically checks the node count, computes the desired Typha replica count using Calico's recommended scaling formula, and patches the Typha Deployment if the count needs to change.

---

## Prerequisites

- Typha deployed in `kube-system` per the setup post in this series
- `kubectl` cluster-admin access
- The CronJob image needs to reach the Kubernetes API server (in-cluster configuration)
- Familiarity with Kubernetes RBAC and CronJob resources

---

## Step 1: Define the Scaling Formula

Calico recommends approximately 1 Typha replica per 200 nodes, with a minimum of 2 (for HA) and a practical maximum of 20. The formula used in this automation:

```plaintext
desired_replicas = max(2, ceil(node_count / 200))
```

For clusters with zone distribution requirements, round up to the nearest multiple of your zone count to ensure one replica per zone.

---

## Step 2: Create the Autoscaler ServiceAccount and RBAC

The CronJob needs minimal permissions: list nodes and patch the Typha Deployment's scale subresource only.

```yaml
# typha-autoscaler-rbac.yaml
# RBAC resources for the Typha autoscaler CronJob
apiVersion: v1
kind: ServiceAccount
metadata:
  name: typha-autoscaler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: typha-autoscaler
rules:
  # Count Ready nodes to determine desired replica count
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["list", "get"]
  # Read current replica count before deciding whether to patch
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get"]
    resourceNames: ["calico-typha"]
  # Patch the scale subresource - restricted to calico-typha only
  - apiGroups: ["apps"]
    resources: ["deployments/scale"]
    verbs: ["get", "patch"]
    resourceNames: ["calico-typha"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: typha-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: typha-autoscaler
subjects:
  - kind: ServiceAccount
    name: typha-autoscaler
    namespace: kube-system
```

```bash
kubectl apply -f typha-autoscaler-rbac.yaml
```

---

## Step 3: Store the Scaling Script in a ConfigMap

Keeping the logic in a ConfigMap means you can update it with `kubectl apply` without rebuilding a container image:

```yaml
# typha-autoscaler-configmap.yaml
# ConfigMap with the Typha autoscaling shell script
apiVersion: v1
kind: ConfigMap
metadata:
  name: typha-autoscaler-script
  namespace: kube-system
data:
  scale.sh: |
    #!/bin/sh
    set -e

    # Tunable constants - adjust for your cluster
    MIN_REPLICAS=2          # Always keep at least 2 Typha pods for HA
    MAX_REPLICAS=20         # Never scale beyond 20 (avoids over-provisioning)
    NODES_PER_REPLICA=200   # Target ratio: 1 Typha pod per 200 nodes
    NAMESPACE="kube-system"
    DEPLOYMENT="calico-typha"

    echo "=== Typha Autoscaler: $(date -u) ==="

    # Count only Ready nodes; NotReady nodes don't run Felix
    NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null \
      | grep -c " Ready " || true)

    echo "Ready nodes: $NODE_COUNT"

    # Ceiling division: (N + D - 1) / D
    DESIRED=$(( (NODE_COUNT + NODES_PER_REPLICA - 1) / NODES_PER_REPLICA ))

    # Apply configured bounds
    [ "$DESIRED" -lt "$MIN_REPLICAS" ] && DESIRED=$MIN_REPLICAS
    [ "$DESIRED" -gt "$MAX_REPLICAS" ] && DESIRED=$MAX_REPLICAS

    echo "Desired replicas: $DESIRED"

    # Fetch current replica count to avoid an unnecessary patch
    CURRENT=$(kubectl get deployment "$DEPLOYMENT" -n "$NAMESPACE" \
      -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

    echo "Current replicas: $CURRENT"

    if [ "$DESIRED" != "$CURRENT" ]; then
      echo "Scaling $DEPLOYMENT: $CURRENT -> $DESIRED"
      kubectl scale deployment "$DEPLOYMENT" -n "$NAMESPACE" \
        --replicas="$DESIRED"
      echo "Scale applied."
    else
      echo "No change needed."
    fi
```

```bash
kubectl apply -f typha-autoscaler-configmap.yaml
```

---

## Step 4: Create the CronJob

```yaml
# typha-autoscaler-cronjob.yaml
# CronJob that runs the Typha scaling script every 5 minutes
apiVersion: batch/v1
kind: CronJob
metadata:
  name: typha-autoscaler
  namespace: kube-system
spec:
  # Run every 5 minutes; adjust to 15 minutes for stable clusters
  schedule: "*/5 * * * *"
  # Prevent overlapping runs during slow API responses
  concurrencyPolicy: Forbid
  # Retain 3 successful and 1 failed job for debugging
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: typha-autoscaler
          restartPolicy: OnFailure
          containers:
            - name: autoscaler
              image: bitnami/kubectl:latest
              command: ["/bin/sh", "/scripts/scale.sh"]
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
              resources:
                requests:
                  cpu: 50m
                  memory: 32Mi
                limits:
                  cpu: 200m
                  memory: 64Mi
          volumes:
            - name: scripts
              configMap:
                name: typha-autoscaler-script
                # Make the script executable
                defaultMode: 0755
```

```bash
kubectl apply -f typha-autoscaler-cronjob.yaml
```

---

## Step 5: Test the Autoscaler Immediately

```bash
# Trigger the CronJob manually to verify it works
kubectl create job typha-autoscaler-manual \
  --from=cronjob/typha-autoscaler \
  --namespace kube-system

# Watch the job logs
kubectl logs -n kube-system -l job-name=typha-autoscaler-manual --follow

# Confirm the Deployment was updated (or confirmed correct)
kubectl get deployment calico-typha -n kube-system
```

---

## Best Practices

- Use `concurrencyPolicy: Forbid` to prevent scale race conditions when API responses are slow.
- Count only `Ready` nodes; `NotReady` nodes do not run Felix and should not inflate the desired replica count.
- Set `MIN_REPLICAS=2` so the autoscaler never reduces Typha below the minimum HA threshold.
- Add a Prometheus alert on `kube_cronjob_status_active{cronjob="typha-autoscaler"} == 0` to detect if the CronJob stops running.
- Pin the `bitnami/kubectl` image to a specific version tag (e.g., `bitnami/kubectl:1.29`) to prevent unexpected behavior on image updates.

---

## Conclusion

A CronJob-based Typha autoscaler ensures your replica count stays aligned with cluster size without manual intervention. The RBAC configuration restricts the autoscaler to modifying only the Typha Deployment, and storing the logic in a ConfigMap makes it easy to update the scaling formula without rebuilding any container images.

---

*Monitor Typha scaling events and get notified when the autoscaler CronJob fails with [OneUptime](https://oneuptime.com).*
