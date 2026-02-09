# How to Implement NFS Subdir External Provisioner for Kubernetes PVC Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NFS, Storage Provisioner

Description: Deploy and configure NFS Subdir External Provisioner for automated PVC management with subdirectory isolation, custom path patterns, quota enforcement, and lifecycle management.

---

The NFS Subdir External Provisioner automates storage provisioning by creating isolated subdirectories on NFS servers for each PersistentVolumeClaim. Unlike static volume provisioning where administrators manually create volumes, this provisioner watches for PVC requests and dynamically creates storage, significantly reducing operational overhead while maintaining isolation between applications.

## Architecture and Components

The provisioner runs as a Deployment in your cluster, monitoring the Kubernetes API for PVC creation events. When a PVC requests storage from a StorageClass configured to use this provisioner, it creates a subdirectory on the NFS server, generates a PersistentVolume pointing to that subdirectory, and binds the PV to the PVC.

Each provisioned volume gets its own subdirectory, preventing applications from accessing each other's data even though they share the same underlying NFS export. The provisioner manages the entire lifecycle including creation, deletion, and optionally archiving volumes when PVCs are removed.

## Installing with Helm

Helm provides the simplest installation method with comprehensive configuration options.

```bash
# Add the Helm repository
helm repo add nfs-subdir-external-provisioner \
  https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner
helm repo update

# Create values file for custom configuration
cat > nfs-provisioner-values.yaml <<EOF
nfs:
  server: 192.168.1.100
  path: /mnt/nfs-share
  mountOptions:
    - nfsvers=4.1
    - hard
    - noatime

storageClass:
  name: nfs-client
  defaultClass: false
  accessModes: ReadWriteMany
  reclaimPolicy: Delete
  archiveOnDelete: false
  pathPattern: "\${.PVC.namespace}/\${.PVC.name}"

image:
  repository: k8s.gcr.io/sig-storage/nfs-subdir-external-provisioner
  tag: v4.0.2

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 50m
    memory: 64Mi

nodeSelector:
  kubernetes.io/os: linux
EOF

# Install the provisioner
helm install nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --namespace nfs-provisioning \
  --create-namespace \
  -f nfs-provisioner-values.yaml
```

Verify the installation:

```bash
kubectl get pods -n nfs-provisioning
kubectl get storageclass nfs-client
kubectl logs -n nfs-provisioning deployment/nfs-provisioner
```

## Manual Deployment

For environments without Helm, deploy using standard Kubernetes manifests.

```yaml
# nfs-provisioner-complete.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nfs-provisioning
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-provisioner
  namespace: nfs-provisioning
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nfs-provisioner-runner
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch", "create", "delete"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "update"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "update", "patch"]
- apiGroups: [""]
  resources: ["endpoints"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: run-nfs-provisioner
subjects:
- kind: ServiceAccount
  name: nfs-provisioner
  namespace: nfs-provisioning
roleRef:
  kind: ClusterRole
  name: nfs-provisioner-runner
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-provisioner
  namespace: nfs-provisioning
  labels:
    app: nfs-provisioner
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: nfs-provisioner
  template:
    metadata:
      labels:
        app: nfs-provisioner
    spec:
      serviceAccountName: nfs-provisioner
      containers:
      - name: nfs-provisioner
        image: k8s.gcr.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2
        volumeMounts:
        - name: nfs-client-root
          mountPath: /persistentvolumes
        env:
        - name: PROVISIONER_NAME
          value: nfs-storage
        - name: NFS_SERVER
          value: 192.168.1.100
        - name: NFS_PATH
          value: /mnt/nfs-share
        resources:
          limits:
            cpu: 200m
            memory: 256Mi
          requests:
            cpu: 100m
            memory: 128Mi
      volumes:
      - name: nfs-client-root
        nfs:
          server: 192.168.1.100
          path: /mnt/nfs-share
```

## Advanced Path Patterns

Customize subdirectory structure using path pattern variables for better organization.

```yaml
# storage-class-patterns.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-by-namespace
provisioner: nfs-storage
parameters:
  archiveOnDelete: "false"
  pathPattern: "${.PVC.namespace}/${.PVC.name}"
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-with-date
provisioner: nfs-storage
parameters:
  archiveOnDelete: "false"
  pathPattern: "${.PVC.namespace}/${.PVC.name}-${.PVC.creationTimestamp}"
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-annotated
provisioner: nfs-storage
parameters:
  archiveOnDelete: "false"
  pathPattern: "${.PVC.annotations.project}/${.PVC.namespace}/${.PVC.name}"
```

Available path pattern variables:
- `${.PVC.name}`: PVC name
- `${.PVC.namespace}`: PVC namespace
- `${.PVC.annotations.<key>}`: Custom annotation value
- `${.PVC.labels.<key>}`: Custom label value

## Archive vs Delete Behavior

Control what happens to data when PVCs are deleted.

```yaml
# Immediately delete data
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-ephemeral
provisioner: nfs-storage
parameters:
  archiveOnDelete: "false"
reclaimPolicy: Delete
---
# Archive data with timestamp
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-archived
provisioner: nfs-storage
parameters:
  archiveOnDelete: "true"
reclaimPolicy: Delete
---
# Retain volumes for manual cleanup
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-retained
provisioner: nfs-storage
parameters:
  archiveOnDelete: "false"
reclaimPolicy: Retain
```

When `archiveOnDelete: "true"`, the provisioner renames directories with an `archived-` prefix and timestamp instead of deleting them:

```bash
# Original directory
/mnt/nfs-share/default/my-app-data

# After PVC deletion with archiving
/mnt/nfs-share/archived-default-my-app-data-2026-02-09-12-30-45
```

## Multi-Server Configuration

Deploy multiple provisioner instances for different NFS servers.

```bash
# Provisioner for fast NFS storage
helm install nfs-fast nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --namespace nfs-provisioning \
  --set nfs.server=fast-nfs.example.com \
  --set nfs.path=/fast \
  --set storageClass.name=nfs-fast \
  --set env[0].name=PROVISIONER_NAME \
  --set env[0].value=nfs-fast-provisioner

# Provisioner for bulk NFS storage
helm install nfs-bulk nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --namespace nfs-provisioning \
  --set nfs.server=bulk-nfs.example.com \
  --set nfs.path=/bulk \
  --set storageClass.name=nfs-bulk \
  --set env[0].name=PROVISIONER_NAME \
  --set env[0].value=nfs-bulk-provisioner
```

Each provisioner manages its own StorageClass and NFS server independently.

## Testing Provisioning

Verify the provisioner creates volumes correctly.

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-claim
  namespace: default
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: nfs-client
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
spec:
  containers:
  - name: test
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Testing NFS provisioning" > /data/test.txt
      cat /data/test.txt
      sleep 3600
    volumeMounts:
    - name: storage
      mountPath: /data
  volumes:
  - name: storage
    persistentVolumeClaim:
      claimName: test-claim
```

Run tests:

```bash
# Apply test resources
kubectl apply -f test-pvc.yaml

# Watch PVC binding
kubectl get pvc test-claim -w

# Check PV creation
kubectl get pv

# Verify pod can write to volume
kubectl logs test-pod

# Check NFS server for created directory
# SSH to NFS server or check from provisioner pod
kubectl exec -n nfs-provisioning deployment/nfs-provisioner -- ls -la /persistentvolumes/default/

# Cleanup
kubectl delete -f test-pvc.yaml
```

## Volume Expansion

Enable volume expansion for growing storage needs.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-expandable
provisioner: nfs-storage
parameters:
  archiveOnDelete: "false"
allowVolumeExpansion: true
```

Expand a volume:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: expandable-claim
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: nfs-expandable
  resources:
    requests:
      storage: 10Gi  # Increase this value to expand
```

Note: NFS volume expansion doesn't enforce quotas at the filesystem level. The size field is informational for Kubernetes scheduling decisions.

## Monitoring and Alerts

Monitor provisioner health and volume provisioning metrics.

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nfs-provisioner
  namespace: nfs-provisioning
spec:
  selector:
    matchLabels:
      app: nfs-provisioner
  endpoints:
  - port: metrics
    interval: 30s
---
# PrometheusRule for alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: nfs-provisioner-alerts
  namespace: nfs-provisioning
spec:
  groups:
  - name: nfs-provisioning
    rules:
    - alert: NFSProvisionerDown
      expr: up{job="nfs-provisioner"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "NFS provisioner is down"

    - alert: HighProvisioningFailureRate
      expr: rate(provisioner_volume_provision_failed_total[5m]) > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High rate of volume provisioning failures"
```

## Troubleshooting

Common issues and solutions:

```bash
# Check provisioner logs
kubectl logs -n nfs-provisioning deployment/nfs-provisioner --tail=100

# Verify NFS mount in provisioner pod
kubectl exec -n nfs-provisioning deployment/nfs-provisioner -- df -h /persistentvolumes

# Test NFS connectivity
kubectl run -it --rm nfs-test --image=busybox --restart=Never -- \
  mount -t nfs 192.168.1.100:/mnt/nfs-share /mnt

# Check PVC events for provisioning errors
kubectl describe pvc <pvc-name>

# Verify StorageClass configuration
kubectl get storageclass nfs-client -o yaml

# Check provisioner RBAC permissions
kubectl auth can-i create persistentvolumes --as=system:serviceaccount:nfs-provisioning:nfs-provisioner
kubectl auth can-i update persistentvolumeclaims --as=system:serviceaccount:nfs-provisioning:nfs-provisioner
```

## Security Considerations

Restrict access and secure NFS mounts.

```yaml
# Run provisioner with security context
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-provisioner
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        fsGroup: 65534
      containers:
      - name: nfs-provisioner
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
```

Use network policies to restrict provisioner traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: nfs-provisioner-policy
  namespace: nfs-provisioning
spec:
  podSelector:
    matchLabels:
      app: nfs-provisioner
  policyTypes:
  - Ingress
  - Egress
  egress:
  - to:
    - podSelector: {}
    ports:
    - protocol: TCP
      port: 443  # Kubernetes API
  - to:
    - ipBlock:
        cidr: 192.168.1.100/32  # NFS server
    ports:
    - protocol: TCP
      port: 2049  # NFS
```

## Conclusion

The NFS Subdir External Provisioner simplifies NFS-based storage management in Kubernetes by automating volume provisioning while maintaining isolation through subdirectories. With flexible path patterns, configurable lifecycle policies, and support for multiple NFS servers, it provides a production-ready solution for shared storage requirements. Deploy it with appropriate security controls, monitor its operation, and leverage its archiving capabilities to prevent accidental data loss while maintaining automated provisioning workflows.
