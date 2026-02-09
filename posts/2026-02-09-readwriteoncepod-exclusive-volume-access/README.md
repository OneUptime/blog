# How to Use ReadWriteOncePod Access Mode for Single-Pod Exclusive Volume Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, AccessMode, PersistentVolume

Description: Learn how to use the ReadWriteOncePod access mode in Kubernetes to ensure exclusive single-pod access to persistent volumes, preventing data corruption in applications that cannot handle concurrent access.

---

The ReadWriteOncePod access mode guarantees that only one pod in the entire cluster can mount a volume for read-write access. This is critical for applications like databases that require exclusive access to prevent data corruption.

## Understanding Access Modes

Kubernetes supports four persistent volume access modes:

1. **ReadWriteOnce (RWO)** - Volume mounted read-write by single node
2. **ReadWriteOncePod (RWOP)** - Volume mounted read-write by single pod
3. **ReadWriteMany (RWX)** - Volume mounted read-write by multiple nodes
4. **ReadOnlyMany (ROX)** - Volume mounted read-only by multiple nodes

The key difference between RWO and RWOP:

- **RWO** allows multiple pods on the same node to mount the volume
- **RWOP** allows only one pod in the entire cluster to mount the volume

## Why Use ReadWriteOncePod

Use RWOP when:

- Running databases that cannot handle concurrent writes
- Applications store state that must be accessed exclusively
- Preventing split-brain scenarios in distributed systems
- Ensuring data consistency in single-writer architectures

## Prerequisites

ReadWriteOncePod requires Kubernetes 1.22+ and CSI drivers that support the feature:

```bash
# Check Kubernetes version
kubectl version --short

# Verify CSI driver supports RWOP
kubectl get csidrivers -o yaml | grep -A 5 "volumeLifecycleModes"
```

## Creating a PVC with ReadWriteOncePod

Define a PVC using the RWOP access mode:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-exclusive-data
spec:
  accessModes:
    - ReadWriteOncePod  # Only one pod can mount this
  resources:
    requests:
      storage: 20Gi
  storageClassName: standard
```

Apply the PVC:

```bash
kubectl apply -f pvc-rwop.yaml

# Verify the PVC
kubectl get pvc postgres-exclusive-data
kubectl describe pvc postgres-exclusive-data
```

## Deploying a Single-Instance Database

Create a PostgreSQL deployment using the RWOP volume:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1  # Must be 1 for RWOP
  selector:
    matchLabels:
      app: postgres
  strategy:
    type: Recreate  # Prevent multiple pods during rollout
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: "securepassword"
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgres-exclusive-data
```

Deploy the application:

```bash
kubectl apply -f postgres-deployment.yaml

# Wait for pod to be ready
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s

# Verify the pod mounted the volume
kubectl exec -it deploy/postgres -- df -h /var/lib/postgresql/data
```

## Testing Exclusive Access Enforcement

Try to create a second pod using the same PVC:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres-second-attempt
spec:
  containers:
  - name: postgres
    image: postgres:15
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-exclusive-data
```

Deploy the second pod:

```bash
kubectl apply -f second-pod.yaml

# Check pod status
kubectl get pod postgres-second-attempt

# The pod will be stuck in Pending state
kubectl describe pod postgres-second-attempt
```

You'll see an event like:

```
Events:
  Type     Reason            Message
  ----     ------            -------
  Warning  FailedMount       Multi-Attach error for volume "pvc-xxxxx"
                            Volume is already exclusively attached to one pod
```

Clean up the failed pod:

```bash
kubectl delete pod postgres-second-attempt
```

## Using RWOP with StatefulSets

StatefulSets work naturally with RWOP since each pod gets its own PVC:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
        - ReadWriteOncePod  # Each pod gets exclusive access to its volume
      resources:
        requests:
          storage: 20Gi
      storageClassName: standard
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
```

Each StatefulSet pod gets its own exclusive volume:

```bash
kubectl apply -f statefulset-rwop.yaml

# Each pod has its own PVC
kubectl get pvc -l app=postgres

# Example output:
# NAME                      STATUS   CAPACITY   ACCESS MODES   AGE
# data-postgres-cluster-0   Bound    20Gi       RWOP           2m
# data-postgres-cluster-1   Bound    20Gi       RWOP           2m
# data-postgres-cluster-2   Bound    20Gi       RWOP           2m
```

## Migrating from RWO to RWOP

Migrate existing RWO volumes to RWOP:

```bash
# Step 1: Scale down the application
kubectl scale deployment postgres --replicas=0

# Step 2: Delete the existing PVC
kubectl get pvc postgres-data -o yaml > pvc-backup.yaml
kubectl delete pvc postgres-data

# Step 3: Create new PVC with RWOP
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOncePod  # Changed from ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: standard
  # Restore from snapshot if needed
  dataSource:
    name: postgres-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
EOF

# Step 4: Scale back up
kubectl scale deployment postgres --replicas=1
```

## Combining RWOP with Pod Disruption Budgets

Ensure high availability during node maintenance:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
spec:
  maxUnavailable: 0  # Prevent voluntary disruptions
  selector:
    matchLabels:
      app: postgres
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: postgres
    spec:
      # Use preStop hook for graceful shutdown
      containers:
      - name: postgres
        image: postgres:15
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - pg_ctl stop -D /var/lib/postgresql/data -m fast
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgres-exclusive-data
      # Ensure pod is scheduled on specific node if needed
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: storage-node
                operator: In
                values:
                - "true"
```

## RWOP with Backup Strategies

Create backup jobs that respect RWOP constraints:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/sh
            - -c
            - |
              # Connect over network, don't mount volume
              pg_dump -h postgres-service -U postgres -d mydatabase > /backup/dump.sql
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc  # Different PVC for backups
```

Alternatively, use snapshots for backups without mounting the volume:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-snapshot-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: create-snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              cat <<EOF | kubectl apply -f -
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: postgres-backup-${TIMESTAMP}
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-exclusive-data
              EOF
```

## Monitoring RWOP Volumes

Track RWOP volume usage:

```bash
# List all RWOP PVCs
kubectl get pvc -A -o json | jq -r '.items[] |
  select(.spec.accessModes[] == "ReadWriteOncePod") |
  "\(.metadata.namespace)/\(.metadata.name): \(.status.phase)"'

# Find pods using RWOP volumes
kubectl get pods -A -o json | jq -r '.items[] |
  select(.spec.volumes[]?.persistentVolumeClaim != null) |
  {
    pod: .metadata.name,
    namespace: .metadata.namespace,
    pvcs: [.spec.volumes[].persistentVolumeClaim.claimName]
  }'

# Check for mount conflicts
kubectl get events -A --field-selector reason=FailedMount
```

## Troubleshooting RWOP Issues

Common problems and solutions:

```bash
# 1. Pod stuck in ContainerCreating
kubectl describe pod <pod-name>

# Look for: "Volume is already exclusively attached"
# Solution: Check if another pod is using the volume
kubectl get pods -A -o json | jq -r '.items[] |
  select(.spec.volumes[]?.persistentVolumeClaim?.claimName == "your-pvc-name") |
  .metadata.name'

# 2. CSI driver doesn't support RWOP
# Error: "ReadWriteOncePod access mode is not supported"

# Solution: Upgrade CSI driver or use RWO instead

# 3. Pod rescheduling issues
# Old pod not terminating, blocking new pod

# Solution: Force delete the old pod
kubectl delete pod <old-pod-name> --grace-period=0 --force

# 4. Node failure prevents pod scheduling
# Volume attached to failed node

# Solution: Wait for volume detachment or manually detach
# (Provider-specific, e.g., AWS CLI to detach EBS volume)
```

## Best Practices

1. **Use RWOP for single-writer databases** to prevent data corruption
2. **Set replica count to 1** in Deployments using RWOP
3. **Use Recreate strategy** to prevent multiple pods during updates
4. **Implement graceful shutdown** with preStop hooks
5. **Monitor volume attachment status** for troubleshooting
6. **Use snapshots for backups** instead of mounting volumes
7. **Test failover scenarios** to ensure recovery works
8. **Document RWOP requirements** for operators

ReadWriteOncePod provides stronger guarantees than ReadWriteOnce, making it the right choice for applications that absolutely cannot tolerate concurrent access to their storage.
