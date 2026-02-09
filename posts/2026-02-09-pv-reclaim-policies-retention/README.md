# How to Configure Persistent Volume Reclaim Policies for Data Retention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Data-Management

Description: Configure Persistent Volume reclaim policies to control data retention behavior when PVCs are deleted, preventing accidental data loss and implementing proper storage lifecycle management.

---

Persistent Volume reclaim policies determine what happens to the underlying storage when a PersistentVolumeClaim is deleted. The wrong policy can lead to accidental data loss or persistent storage leaks that waste resources. Understanding and properly configuring reclaim policies is essential for production storage management.

Kubernetes offers three reclaim policies: Delete removes both the PV object and the underlying storage resource, Retain keeps the PV and storage for manual recovery, and Recycle performs basic scrubbing before making the volume available again. This guide explores when to use each policy, how to change policies on existing volumes, and strategies for implementing data retention requirements.

## Understanding Reclaim Policy Behavior

The reclaim policy is set on the PersistentVolume or StorageClass and determines the cleanup behavior when the associated PVC is deleted. With the Delete policy, Kubernetes calls the storage provisioner to delete the backing storage automatically. With Retain, the PV enters a Released state and requires manual intervention to recover or delete the data.

The Recycle policy is deprecated and only supported by NFS and HostPath volumes. It performed a basic `rm -rf` on the volume before making it available for new claims. For production use, you should choose between Delete and Retain based on your data retention requirements.

When a PVC is deleted, the PV first enters a Released state. For Delete policy, the volume plugin deletes the underlying storage and then removes the PV object. For Retain policy, the PV stays in Released state with all data intact, preventing automatic reuse until an administrator manually intervenes.

## Setting Reclaim Policy in StorageClasses

StorageClasses define the default reclaim policy for dynamically provisioned volumes.

```yaml
# storage-class-delete.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-delete
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# storage-class-retain.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-retain
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Use Delete policy for ephemeral or easily reproducible data like caches, temporary processing workloads, or development environments. Use Retain policy for production databases, user data, or any storage requiring backup verification before deletion.

```bash
kubectl apply -f storage-class-delete.yaml
kubectl apply -f storage-class-retain.yaml

# Verify policies
kubectl get storageclass -o custom-columns=NAME:.metadata.name,PROVISIONER:.provisioner,RECLAIM:.reclaimPolicy
```

## Changing Reclaim Policy on Existing PVs

You can modify the reclaim policy on existing PersistentVolumes using kubectl patch.

```bash
# Check current reclaim policy
kubectl get pv

# Change specific PV from Delete to Retain
kubectl patch pv <pv-name> -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'

# Verify change
kubectl get pv <pv-name> -o jsonpath='{.spec.persistentVolumeReclaimPolicy}'

# Change all PVs in a specific storage class
kubectl get pv -o json | \
  jq -r '.items[] | select(.spec.storageClassName=="fast-delete") | .metadata.name' | \
  xargs -I {} kubectl patch pv {} -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```

This is particularly useful before performing maintenance, testing restore procedures, or protecting critical data during cluster migrations.

## Implementing Retain Policy Workflows

When using Retain policy, implement procedures for handling Released volumes.

```yaml
# production-database.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  labels:
    app: postgres
    retention: critical
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-retain
  resources:
    requests:
      storage: 100Gi
```

Create the PVC and deploy your database.

```bash
kubectl apply -f production-database.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/postgres-data

# Note the PV name for later recovery
PV_NAME=$(kubectl get pvc postgres-data -o jsonpath='{.spec.volumeName}')
echo "PV Name: $PV_NAME"

# Simulate accidental PVC deletion
kubectl delete pvc postgres-data

# Check PV status - should be Released
kubectl get pv $PV_NAME
kubectl describe pv $PV_NAME
```

The volume remains in Released state with data intact.

## Recovering Data from Released PVs

To recover data from a Released PV, remove the claimRef and create a new PVC.

```bash
# Remove claimRef to make PV Available again
kubectl patch pv $PV_NAME -p '{"spec":{"claimRef": null}}'

# Verify PV is now Available
kubectl get pv $PV_NAME

# Create new PVC to bind to existing PV
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-recovered
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-retain
  volumeName: $PV_NAME
  resources:
    requests:
      storage: 100Gi
EOF

# Wait for binding
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/postgres-data-recovered

# Deploy application using recovered PVC
kubectl set volume deployment/postgres --add --name=data --type=persistentVolumeClaim --claim-name=postgres-data-recovered --mount-path=/var/lib/postgresql/data
```

The application can now access the original data.

## Automating Reclaim Policy Management

Create an admission webhook or operator to enforce reclaim policies based on labels.

```yaml
# reclaim-policy-mutator.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: reclaim-policy-rules
  namespace: storage-system
data:
  rules.yaml: |
    rules:
    - labelSelector:
        matchLabels:
          retention: critical
      reclaimPolicy: Retain
    - labelSelector:
        matchLabels:
          environment: production
      reclaimPolicy: Retain
    - labelSelector:
        matchLabels:
          environment: development
      reclaimPolicy: Delete
    - default: Delete
```

Implement a simple controller that watches PVCs and patches the associated PV.

```yaml
# reclaim-controller-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reclaim-policy-controller
  namespace: storage-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: reclaim-controller
  template:
    metadata:
      labels:
        app: reclaim-controller
    spec:
      serviceAccountName: reclaim-controller
      containers:
      - name: controller
        image: bitnami/kubectl:latest
        command: ['/bin/bash', '-c']
        args:
        - |
          #!/bin/bash
          set -e

          while true; do
            # Get all bound PVCs
            kubectl get pvc -A -o json | jq -r '.items[] |
              select(.status.phase=="Bound") |
              {
                namespace: .metadata.namespace,
                name: .metadata.name,
                pv: .spec.volumeName,
                labels: .metadata.labels
              }' | while read -r pvc; do

              NAMESPACE=$(echo $pvc | jq -r '.namespace')
              NAME=$(echo $pvc | jq -r '.name')
              PV=$(echo $pvc | jq -r '.pv')

              # Check for retention label
              RETENTION=$(kubectl get pvc -n $NAMESPACE $NAME -o jsonpath='{.metadata.labels.retention}')
              ENVIRONMENT=$(kubectl get pvc -n $NAMESPACE $NAME -o jsonpath='{.metadata.labels.environment}')

              DESIRED_POLICY="Delete"

              if [ "$RETENTION" == "critical" ] || [ "$ENVIRONMENT" == "production" ]; then
                DESIRED_POLICY="Retain"
              fi

              # Get current policy
              CURRENT_POLICY=$(kubectl get pv $PV -o jsonpath='{.spec.persistentVolumeReclaimPolicy}')

              # Update if different
              if [ "$CURRENT_POLICY" != "$DESIRED_POLICY" ]; then
                echo "Updating PV $PV from $CURRENT_POLICY to $DESIRED_POLICY"
                kubectl patch pv $PV -p "{\"spec\":{\"persistentVolumeReclaimPolicy\":\"$DESIRED_POLICY\"}}"
              fi
            done

            sleep 60
          done
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
```

Create RBAC for the controller.

```yaml
# reclaim-controller-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: reclaim-controller
  namespace: storage-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: reclaim-controller
rules:
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch", "patch"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: reclaim-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: reclaim-controller
subjects:
- kind: ServiceAccount
  name: reclaim-controller
  namespace: storage-system
```

Deploy the controller.

```bash
kubectl create namespace storage-system
kubectl apply -f reclaim-controller-rbac.yaml
kubectl apply -f reclaim-controller-deployment.yaml

# Test with labeled PVCs
kubectl label pvc postgres-data retention=critical
kubectl logs -n storage-system deployment/reclaim-policy-controller
```

## Implementing Backup-Before-Delete Policies

For Delete policy volumes, implement backup verification before deletion using finalizers.

```yaml
# backup-finalizer-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pvc-deletion-validator
webhooks:
- name: validate-pvc-deletion.storage.example.com
  clientConfig:
    service:
      name: pvc-deletion-validator
      namespace: storage-system
      path: /validate
    caBundle: <base64-encoded-ca-cert>
  rules:
  - operations: ["DELETE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["persistentvolumeclaims"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

The webhook checks for recent backups before allowing PVC deletion.

## Monitoring Reclaim Policy Compliance

Track PV reclaim policies and alert on misconfigurations.

```bash
# List all PVs with their reclaim policies
kubectl get pv -o custom-columns=\
NAME:.metadata.name,\
CLAIM:.spec.claimRef.name,\
STORAGECLASS:.spec.storageClassName,\
RECLAIM:.spec.persistentVolumeReclaimPolicy,\
STATUS:.status.phase

# Find PVs in Released state (potential data retention)
kubectl get pv -o json | \
  jq -r '.items[] |
    select(.status.phase=="Released") |
    {name: .metadata.name, capacity: .spec.capacity.storage, policy: .spec.persistentVolumeReclaimPolicy}'

# Find production PVCs without Retain policy
kubectl get pvc -A -l environment=production -o json | \
  jq -r '.items[] |
    select(.status.phase=="Bound") |
    .spec.volumeName' | \
  xargs -I {} kubectl get pv {} -o json | \
  jq -r 'select(.spec.persistentVolumeReclaimPolicy!="Retain") |
    {pv: .metadata.name, policy: .spec.persistentVolumeReclaimPolicy}'
```

Create Prometheus alerts for policy violations.

```yaml
# prometheus-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pv-reclaim-alerts
spec:
  groups:
  - name: storage-reclaim
    interval: 60s
    rules:
    - alert: ProductionPVWithDeletePolicy
      expr: |
        kube_persistentvolume_claim_ref{label_environment="production"}
        * on(persistentvolume) group_left()
        (kube_persistentvolume_reclaim_policy{policy="Delete"} == 1)
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Production PV {{ $labels.persistentvolume }} has Delete reclaim policy"
        description: "PV backing production PVC should use Retain policy to prevent data loss"
```

## Cleaning Up Released PVs

Implement scheduled cleanup of Released PVs after backup verification.

```bash
# Manual cleanup process
# 1. List Released PVs
kubectl get pv -o json | jq -r '.items[] | select(.status.phase=="Released") | .metadata.name'

# 2. Verify backups exist
for pv in $(kubectl get pv -o json | jq -r '.items[] | select(.status.phase=="Released") | .metadata.name'); do
  echo "Checking backup for $pv"
  # Add your backup verification logic here
done

# 3. Delete PV and underlying storage
kubectl delete pv <pv-name>

# For AWS EBS volumes, delete via AWS CLI
aws ec2 delete-volume --volume-id <volume-id>
```

Properly configured reclaim policies protect against accidental data loss while enabling efficient storage management. By choosing Retain for production data and Delete for ephemeral workloads, implementing automated policy enforcement, and maintaining procedures for recovering Released volumes, you create a robust storage lifecycle management system that balances data protection with operational efficiency.
