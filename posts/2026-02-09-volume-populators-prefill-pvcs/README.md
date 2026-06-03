# How to Use Volume Populators to Pre-Fill PVCs from Custom Data Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, VolumePopulator, DataSource

Description: Learn how to use volume populators to pre-fill persistent volumes with data from custom sources like object storage, HTTP endpoints, and git repositories.

---

Volume populators allow you to automatically populate persistent volumes with data from custom sources during provisioning. This eliminates manual data loading steps and enables declarative data initialization for databases, content management systems, and applications requiring seed data.

## Understanding Volume Populators

Volume populators work through the dataSourceRef field in PVCs, which can reference custom resources that populate volumes. The populator controller watches for these references and provisions a populated volume before application pods use the claim.

Key benefits:

- **Automated data initialization** - No manual steps needed
- **Declarative configuration** - Data source defined in YAML
- **Multiple source types** - S3, HTTP, Git, databases
- **Reproducible deployments** - Same data initialization every time

## Prerequisites

Volume populators require Kubernetes 1.24+ with the AnyVolumeDataSource feature gate. The feature is beta from Kubernetes 1.24 through 1.32 and GA in Kubernetes 1.33+.

Verify feature availability:

```bash
# Check whether the PVC field is available in your cluster API
kubectl explain persistentvolumeclaim.spec.dataSourceRef

# After installing the validator, check for the VolumePopulator CRD
kubectl get crd volumepopulators.populator.storage.k8s.io
```

## Installing a Volume Populator

Volume populators are external controllers. A production populator is usually built with the lib-volume-populator library and packaged as a purpose-built controller image:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: volume-populator
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: http-populator
  namespace: volume-populator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: http-populator
  template:
    metadata:
      labels:
        app: http-populator
    spec:
      serviceAccountName: http-populator
      containers:
      - name: populator
        image: example/http-populator:v1
        args:
        - --mode=controller
        - --image-name=example/http-populator:v1
        - --http-endpoint=0.0.0.0:8080
        - --metrics-endpoint=0.0.0.0:8081
```

For this example, install the volume data source validator first. The validator is not a populator; it registers the VolumePopulator API and emits warning events when a PVC references a data source kind that no installed populator handles.

```bash
# Install the volume-data-source-validator
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/volume-data-source-validator/v1.0.1/client/config/crd/populator.storage.k8s.io_volumepopulators.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/volume-data-source-validator/v1.0.1/deploy/kubernetes/rbac-data-source-validator.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/volume-data-source-validator/v1.0.1/deploy/kubernetes/setup-data-source-validator.yaml
```

## Defining a Custom Data Source

Create a CRD for your data source:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: s3sources.populator.storage.k8s.io
spec:
  group: populator.storage.k8s.io
  names:
    kind: S3Source
    listKind: S3SourceList
    plural: s3sources
    singular: s3source
  scope: Namespaced
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required:
            - bucket
            - key
            properties:
              bucket:
                type: string
                description: S3 bucket name
              key:
                type: string
                description: Object key in S3
              region:
                type: string
                description: AWS region
                default: us-east-1
              endpoint:
                type: string
                description: Custom S3 endpoint
```

Apply the CRD:

```bash
kubectl apply -f s3source-crd.yaml
```

Register the source kind with the validator:

```yaml
apiVersion: populator.storage.k8s.io/v1beta1
kind: VolumePopulator
metadata:
  name: s3-populator
sourceKind:
  group: populator.storage.k8s.io
  kind: S3Source
```

## Creating a Data Source Resource

Create an S3 data source:

```yaml
apiVersion: populator.storage.k8s.io/v1alpha1
kind: S3Source
metadata:
  name: database-backup
  namespace: default
spec:
  bucket: my-backups
  key: mysql-backup-20260209.tar.gz
  region: us-east-1
```

Or, after creating a matching GitSource CRD and installing a populator that handles it, a Git repository source:

```yaml
apiVersion: populator.storage.k8s.io/v1alpha1
kind: GitSource
metadata:
  name: website-content
  namespace: default
spec:
  repository: https://github.com/myorg/website.git
  ref: main
  subPath: static-content
```

## Using Volume Populators in PVCs

Create a PVC that references the data source:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data-prefilled
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: standard
  # Reference the data source
  dataSourceRef:
    apiGroup: populator.storage.k8s.io
    kind: S3Source
    name: database-backup
```

Most lib-volume-populator based controllers will:

1. Detect the dataSourceRef
2. Create a temporary "prime" PVC
3. Run the provider-specific population logic, often in a populator pod
4. Download data from S3
5. Extract to the volume
6. Clean up temporary resources and make the original PVC usable

Deploy and verify:

```bash
kubectl apply -f s3-source.yaml
kubectl apply -f pvc-with-populator.yaml

# Watch the population process
kubectl get events --watch

# You'll see events like:
# - PVC created
# - Populator pod started
# - Data downloaded
# - Volume populated
# - PVC bound

# Check PVC status
kubectl get pvc mysql-data-prefilled
# STATUS should be "Bound" after population completes
```

## Creating a Simple HTTP Populator

Here's a basic implementation of an HTTP populator:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: httpsources.populator.storage.k8s.io
spec:
  group: populator.storage.k8s.io
  names:
    kind: HTTPSource
    listKind: HTTPSourceList
    plural: httpsources
    singular: httpsource
  scope: Namespaced
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required:
            - url
            properties:
              url:
                type: string
              checksum:
                type: string
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: http-populator
  namespace: volume-populator
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: http-populator
rules:
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "create", "delete", "patch"]
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "create", "delete"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["populator.storage.k8s.io"]
  resources: ["httpsources"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: http-populator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: http-populator
subjects:
- kind: ServiceAccount
  name: http-populator
  namespace: volume-populator
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: http-populator
  namespace: volume-populator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: http-populator
  template:
    metadata:
      labels:
        app: http-populator
    spec:
      serviceAccountName: http-populator
      containers:
      - name: controller
        image: example/http-populator:v1
        args:
        - --mode=controller
        - --image-name=example/http-populator:v1
        - --http-endpoint=:8080
---
apiVersion: populator.storage.k8s.io/v1beta1
kind: VolumePopulator
metadata:
  name: http-populator
sourceKind:
  group: populator.storage.k8s.io
  kind: HTTPSource
```

## Example: Pre-filling with Database Dump

Create a data source for a database dump:

```yaml
apiVersion: populator.storage.k8s.io/v1alpha1
kind: HTTPSource
metadata:
  name: postgres-dump
spec:
  url: https://backups.example.com/postgres-dump.sql.gz
  checksum: sha256:abc123...
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-prefilled
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
  dataSourceRef:
    apiGroup: populator.storage.k8s.io
    kind: HTTPSource
    name: postgres-dump
```

Deploy PostgreSQL with pre-filled data:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
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
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: "password"
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: data
          mountPath: /docker-entrypoint-initdb.d
          readOnly: true
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgres-data-prefilled
```

## Monitoring Volume Population

Track population progress:

```bash
# Watch events related to PVC
kubectl get events --field-selector involvedObject.name=mysql-data-prefilled -w

# Check populator pod logs
kubectl logs -l app=http-populator -n volume-populator

# Verify data was populated
kubectl exec -it <app-pod> -- ls -lah /data
```

## Best Practices

1. **Verify data sources** before creating PVCs
2. **Use checksums** to ensure data integrity
3. **Set timeouts** for large data downloads
4. **Monitor population failures** and retry
5. **Clean up** temporary resources after population
6. **Test populators** in non-production first
7. **Document data sources** for team clarity
8. **Implement retries** for transient failures

Volume populators streamline application deployment by automating data initialization, making it easy to spin up pre-configured databases, content repositories, and applications with consistent starting data.
