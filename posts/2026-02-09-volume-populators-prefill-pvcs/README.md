# How to Use Volume Populators to Pre-Fill PVCs from Custom Data Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, VolumePopulator, DataSource

Description: Learn how to use volume populators to pre-fill persistent volumes with data from custom sources like object storage, HTTP endpoints, and git repositories, enabling automated data initialization for applications.

---

Volume populators allow you to automatically populate persistent volumes with data from custom sources during provisioning. This eliminates manual data loading steps and enables declarative data initialization for databases, content management systems, and applications requiring seed data.

## Understanding Volume Populators

Volume populators work through the dataSourceRef field in PVCs, which can reference custom resources that populate volumes. The populator controller watches for these references and fills volumes before they're bound to pods.

Key benefits:

- **Automated data initialization** - No manual steps needed
- **Declarative configuration** - Data source defined in YAML
- **Multiple source types** - S3, HTTP, Git, databases
- **Reproducible deployments** - Same data initialization every time

## Prerequisites

Volume populators require Kubernetes 1.24+ with the AnyVolumeDataSource feature gate (beta in 1.24+, GA in 1.26+).

Verify feature availability:

```bash
# Check if volume data sources are available
kubectl api-resources | grep -i volumepopulator

# Check for VolumePopulator CRD
kubectl get crd | grep populator
```

## Installing a Volume Populator

Let's use the lib-volume-populator library to create a simple HTTP populator:

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
      serviceAccountName: populator-controller
      containers:
      - name: populator
        image: example/http-populator:latest
        args:
        - --mode=controller
        - --http-endpoint=0.0.0.0:8080
        - --metrics-endpoint=0.0.0.0:8081
```

For this example, we'll use a pre-built S3 volume populator:

```bash
# Install the volume-data-source-validator
kubectl apply -f https://github.com/kubernetes-csi/volume-data-source-validator/releases/download/v1.0.0/client-gen.yaml
kubectl apply -f https://github.com/kubernetes-csi/volume-data-source-validator/releases/download/v1.0.0/crd.yaml
kubectl apply -f https://github.com/kubernetes-csi/volume-data-source-validator/releases/download/v1.0.0/volume-data-source-validator.yaml
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

Or a Git repository source:

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

The volume populator will:

1. Detect the dataSourceRef
2. Create a temporary PVC
3. Spin up a populator pod
4. Download data from S3
5. Extract to the volume
6. Bind the PVC to the populated volume

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
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "create", "delete"]
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
        image: alpine:latest
        command:
        - /bin/sh
        - -c
        - |
          # Simple populator that downloads from URL
          apk add --no-cache curl jq

          while true; do
            # Watch for PVCs with HTTPSource dataSourceRef
            kubectl get pvc -A -o json | \
            jq -r '.items[] |
              select(.spec.dataSourceRef.kind == "HTTPSource") |
              "\(.metadata.namespace)/\(.metadata.name)/\(.spec.dataSourceRef.name)"' | \
            while IFS=/ read namespace pvc source; do
              # Get the HTTP URL from the source
              URL=$(kubectl get httpsource -n $namespace $source -o jsonpath='{.spec.url}')

              # Create populator pod
              kubectl run -n $namespace populator-$pvc \
                --image=alpine:latest \
                --restart=Never \
                --overrides="{
                  \"spec\": {
                    \"containers\": [{
                      \"name\": \"populator\",
                      \"image\": \"alpine:latest\",
                      \"command\": [\"sh\", \"-c\", \"apk add curl && curl -o /data/file $URL\"],
                      \"volumeMounts\": [{
                        \"name\": \"data\",
                        \"mountPath\": \"/data\"
                      }]
                    }],
                    \"volumes\": [{
                      \"name\": \"data\",
                      \"persistentVolumeClaim\": {
                        \"claimName\": \"$pvc\"
                      }
                    }]
                  }
                }"
            done

            sleep 10
          done
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
      initContainers:
      - name: restore-dump
        image: postgres:15
        command:
        - /bin/bash
        - -c
        - |
          # Wait for dump file
          while [ ! -f /data/postgres-dump.sql.gz ]; do
            echo "Waiting for dump file..."
            sleep 5
          done

          # Extract and restore
          gunzip /data/postgres-dump.sql.gz
          PGPASSWORD=password psql -h localhost -U postgres < /data/postgres-dump.sql
        volumeMounts:
        - name: data
          mountPath: /data
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: "password"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
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
kubectl logs -l app=volume-populator -n volume-populator

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
