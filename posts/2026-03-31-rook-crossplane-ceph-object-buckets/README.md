# How to Use Crossplane to Manage Ceph Object Buckets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Crossplane, Kubernetes, Object Storage, IaC

Description: Use Crossplane and the Rook Object Bucket Claim API to provision and manage Ceph RGW buckets as Kubernetes-native resources with self-service workflows.

---

Crossplane extends Kubernetes to manage external infrastructure as custom resources. Combined with Rook's Object Bucket Claim (OBC) API, teams can provision Ceph S3 buckets through standard Kubernetes workflows without direct cluster access.

## Understanding Object Bucket Claims

Rook implements the Object Bucket Claim spec, which is part of the Lib Bucket Provisioner pattern. When you create an OBC, Rook automatically:
1. Creates the S3 bucket in Ceph RGW
2. Creates a user and credentials
3. Populates a ConfigMap and Secret with connection details

## Setting Up the StorageClass

First, create a StorageClass that references your object store:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-bucket
provisioner: rook-ceph.ceph.rook.io/bucket
reclaimPolicy: Delete
parameters:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
  region: us-east-1
```

## Creating an Object Bucket Claim

Teams can request buckets by submitting an OBC:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: my-app-bucket
  namespace: my-app
spec:
  generateBucketName: my-app-data
  storageClassName: rook-ceph-bucket
  additionalConfig:
    maxSize: "10Gi"
    maxObjects: "1000000"
```

Rook creates a ConfigMap and Secret with the same name as the OBC:

```bash
# Get bucket endpoint
kubectl -n my-app get configmap my-app-bucket -o yaml
# Keys: BUCKET_HOST, BUCKET_PORT, BUCKET_NAME, BUCKET_REGION

# Get credentials
kubectl -n my-app get secret my-app-bucket -o yaml
# Keys: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

## Using Crossplane Compositions for Bucket Provisioning

To compose an ObjectBucketClaim in a Crossplane Composition, Crossplane needs RBAC permissions to manage OBC resources. Create a ClusterRole that aggregates into the Crossplane service account:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: crossplane-obc-access
  labels:
    rbac.crossplane.io/aggregate-to-crossplane: "true"
rules:
  - apiGroups: ["objectbucket.io"]
    resources: ["objectbucketclaims"]
    verbs: ["*"]
```

Then define a Crossplane Composition that wraps the OBC with additional resources:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: ceph-bucket
spec:
  compositeTypeRef:
    apiVersion: storage.example.com/v1alpha1
    kind: XBucket
  resources:
    - name: obc
      base:
        apiVersion: objectbucket.io/v1alpha1
        kind: ObjectBucketClaim
        spec:
          storageClassName: rook-ceph-bucket
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.bucketName
          toFieldPath: spec.generateBucketName
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.maxSize
          toFieldPath: spec.additionalConfig.maxSize
```

## Defining the Composite Resource Definition

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xbuckets.storage.example.com
spec:
  group: storage.example.com
  names:
    kind: XBucket
    plural: xbuckets
  claimNames:
    kind: Bucket
    plural: buckets
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                parameters:
                  type: object
                  properties:
                    bucketName:
                      type: string
                    maxSize:
                      type: string
                      default: "10Gi"
```

## Self-Service Bucket Provisioning

Application teams can now claim buckets without cluster admin privileges:

```yaml
# Developer submits this to their namespace
apiVersion: storage.example.com/v1alpha1
kind: Bucket
metadata:
  name: user-uploads
  namespace: ecommerce
spec:
  parameters:
    bucketName: user-uploads-prod
    maxSize: "50Gi"
```

## Consuming Bucket Credentials in an Application

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          envFrom:
            - configMapRef:
                name: my-app-bucket
            - secretRef:
                name: my-app-bucket
```

## Summary

Crossplane combined with Rook's Object Bucket Claim API creates a self-service bucket provisioning workflow where developers claim S3-compatible buckets through standard Kubernetes resources. Crossplane Compositions add an abstraction layer that enforces organizational policies like size limits and naming conventions without requiring direct access to the Ceph cluster.
