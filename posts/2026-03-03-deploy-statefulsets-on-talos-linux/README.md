# How to Deploy StatefulSets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, StatefulSets, Persistent Storage, Stateful Applications

Description: A complete guide to deploying and managing StatefulSets on Talos Linux for stateful applications like databases and message queues.

---

Not every workload is stateless. Databases, message queues, distributed caches, and many other applications need stable network identities, persistent storage, and ordered deployment. Kubernetes StatefulSets are designed for exactly these scenarios. On Talos Linux, deploying StatefulSets works well, but there are some storage and configuration details specific to the immutable OS that you need to handle correctly.

## What Makes StatefulSets Different

A StatefulSet is not just a Deployment with persistent volumes. It provides several guarantees that Deployments do not:

- **Stable pod names** - Pods get predictable names like `mysql-0`, `mysql-1`, `mysql-2` instead of random hashes
- **Ordered deployment and scaling** - Pods are created sequentially (0, then 1, then 2) and terminated in reverse order
- **Stable network identity** - Each pod gets a DNS name that persists across restarts
- **Persistent volume claims per pod** - Each pod gets its own volume that follows it across rescheduling

These properties are essential for applications like MySQL replication, Kafka clusters, or Redis Sentinel setups.

## Setting Up Storage for StatefulSets on Talos Linux

Before deploying a StatefulSet, you need a storage backend. Talos Linux does not come with a built-in storage provisioner, so you have several options:

**Option 1: Local path provisioner for development**

```bash
# Install the Rancher local-path-provisioner
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-provisioner.yaml

# Make it the default storage class
kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

**Option 2: Longhorn for production (distributed storage)**

```bash
# Install Longhorn using Helm
helm repo add longhorn https://charts.longhorn.io
helm repo update

helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultDataPath=/var/lib/longhorn
```

**Option 3: OpenEBS, Rook-Ceph, or cloud provider volumes** depending on your infrastructure.

Verify your storage class is available:

```bash
# List available storage classes
kubectl get storageclasses

# You should see at least one storage class marked as (default)
```

## Deploying a Basic StatefulSet

Here is a complete example deploying a PostgreSQL StatefulSet with persistent storage:

```yaml
# postgres-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: database
  labels:
    app: postgres
spec:
  ports:
  - port: 5432
    name: postgres
  # Headless service - required for StatefulSet DNS
  clusterIP: None
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: "postgres-headless"
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "1"
            memory: "2Gi"
        # Readiness probe to check if postgres is accepting connections
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 10
          periodSeconds: 5
  # Volume claim template - creates one PVC per pod
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "longhorn"
      resources:
        requests:
          storage: 20Gi
```

Create the namespace and secret first:

```bash
# Create the namespace
kubectl create namespace database

# Create the password secret
kubectl create secret generic postgres-secret \
  --namespace database \
  --from-literal=password=your-secure-password-here

# Deploy the StatefulSet
kubectl apply -f postgres-statefulset.yaml

# Watch the pods come up in order
kubectl get pods -n database -w
```

You will see `postgres-0` start first, and only after it is ready will `postgres-1` begin, followed by `postgres-2`.

## Understanding StatefulSet DNS

The headless service creates DNS entries for each pod. The format is:

```
<pod-name>.<service-name>.<namespace>.svc.cluster.local
```

So for our PostgreSQL example:

```bash
# Each pod gets a stable DNS name
# postgres-0.postgres-headless.database.svc.cluster.local
# postgres-1.postgres-headless.database.svc.cluster.local
# postgres-2.postgres-headless.database.svc.cluster.local

# Test DNS resolution from another pod
kubectl run dns-test --image=busybox:1.36 --rm -it -- nslookup postgres-0.postgres-headless.database.svc.cluster.local
```

This stable DNS is what makes StatefulSets useful for clustered applications. Each replica can discover and connect to its peers using predictable hostnames.

## Scaling StatefulSets

Scaling a StatefulSet works differently from scaling a Deployment:

```bash
# Scale up - new pods are added sequentially
kubectl scale statefulset postgres -n database --replicas=5

# Scale down - pods are removed in reverse order (4, then 3)
kubectl scale statefulset postgres -n database --replicas=3
```

When you scale down, the PVCs are not automatically deleted. This is by design. If you scale back up, the same volumes are reattached to the same pod ordinals. This means your data is preserved across scaling events.

## Update Strategies

StatefulSets support two update strategies:

**RollingUpdate (default)** - Pods are updated one at a time, starting from the highest ordinal:

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      # Only update pods with ordinal >= 2
      # Useful for canary testing
      partition: 2
```

**OnDelete** - Pods are only updated when you manually delete them:

```yaml
spec:
  updateStrategy:
    type: OnDelete
```

The partition feature is particularly useful. If you set `partition: 2` and have 3 replicas (0, 1, 2), only pod 2 gets the update. Once you verify it is working, set partition to 0 to roll out to all pods.

## Talos Linux Storage Considerations

Talos Linux uses an ephemeral root filesystem. The only persistent directory is `/var`, and even that has specific constraints. When using local storage for StatefulSets on Talos, you need to configure the correct mount points.

In your Talos machine configuration, you can set up extra disks for persistent storage:

```yaml
# talos-machine-config.yaml
machine:
  disks:
  - device: /dev/sdb
    partitions:
    - mountpoint: /var/lib/longhorn
      size: 100GB
  kubelet:
    extraMounts:
    - destination: /var/lib/longhorn
      type: bind
      source: /var/lib/longhorn
      options:
      - bind
      - rshared
      - rw
```

Apply this to your worker nodes:

```bash
# Apply disk configuration to worker nodes
talosctl apply-config --nodes 192.168.1.20 --patch @talos-machine-config.yaml
```

## Managing StatefulSet Lifecycle

Here are some common operations you will need:

```bash
# Check the status of your StatefulSet
kubectl describe statefulset postgres -n database

# List PVCs associated with the StatefulSet
kubectl get pvc -n database

# Force delete a stuck pod (use carefully)
kubectl delete pod postgres-1 -n database --grace-period=0 --force

# Delete StatefulSet but keep the pods running
kubectl delete statefulset postgres -n database --cascade=orphan

# Clean up PVCs after deleting a StatefulSet
kubectl delete pvc -l app=postgres -n database
```

## Best Practices

Always use anti-affinity rules to spread StatefulSet pods across different nodes:

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - postgres
              topologyKey: kubernetes.io/hostname
```

Set Pod Disruption Budgets to prevent too many pods from going down at once during maintenance:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
  namespace: database
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: postgres
```

StatefulSets on Talos Linux are a reliable way to run stateful workloads. The combination of Talos's stable platform, proper storage configuration, and Kubernetes StatefulSet guarantees gives you a solid foundation for databases, message queues, and other applications that need persistent identity and storage.
