# How to Use Pulumi to Deploy Rook-Ceph on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pulumi, Kubernetes, Infrastructure as Code, TypeScript

Description: Deploy and manage Rook-Ceph on Kubernetes using Pulumi's TypeScript SDK for type-safe, programmatic infrastructure management with real programming language features.

---

Pulumi offers a programmatic alternative to Terraform for infrastructure as code. Its TypeScript SDK provides type safety, loops, conditionals, and package imports that make complex Rook-Ceph configurations easier to manage.

## Project Setup

```bash
# Create a project directory and initialize a Pulumi project
mkdir rook-ceph-deployment && cd rook-ceph-deployment
pulumi new typescript --name rook-ceph-deployment

# Install required packages
npm install @pulumi/kubernetes
```

## Program Structure

```typescript
// index.ts
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const namespace = config.get("namespace") || "rook-ceph";
const cephVersion = config.get("cephVersion") || "v18.2.0";
const replicaCount = config.getNumber("replicas") || 3;
```

## Installing the Rook Operator

```typescript
// Install Rook-Ceph operator via Helm
const rookNamespace = new k8s.core.v1.Namespace("rook-ceph-ns", {
  metadata: { name: namespace }
});

const rookOperator = new k8s.helm.v3.Release("rook-operator", {
  name: "rook-ceph",
  chart: "rook-ceph",
  repositoryOpts: {
    repo: "https://charts.rook.io/release"
  },
  version: "v1.13.0",
  namespace: namespace,
  values: {
    csi: {
      enableRbdDriver: true,
      enableCephfsDriver: true
    }
  }
}, { dependsOn: rookNamespace });
```

## Deploying the CephCluster Custom Resource

```typescript
// Deploy CephCluster custom resource
const cephCluster = new k8s.apiextensions.CustomResource("ceph-cluster", {
  apiVersion: "ceph.rook.io/v1",
  kind: "CephCluster",
  metadata: {
    name: "rook-ceph",
    namespace: namespace
  },
  spec: {
    cephVersion: {
      image: `quay.io/ceph/ceph:${cephVersion}`,
      allowUnsupported: false
    },
    dataDirHostPath: "/var/lib/rook",
    mon: {
      count: replicaCount,
      allowMultiplePerNode: false
    },
    mgr: {
      count: 2
    },
    dashboard: {
      enabled: true,
      ssl: true
    },
    storage: {
      useAllNodes: true,
      useAllDevices: false,
      deviceFilter: "^sd[b-z]"
    }
  }
}, { dependsOn: rookOperator });
```

## Creating Block Storage Resources

```typescript
// CephBlockPool and StorageClass
const blockPool = new k8s.apiextensions.CustomResource("block-pool", {
  apiVersion: "ceph.rook.io/v1",
  kind: "CephBlockPool",
  metadata: {
    name: "replicapool",
    namespace: namespace
  },
  spec: {
    failureDomain: "host",
    replicated: {
      size: replicaCount,
      requireSafeReplicaSize: true
    }
  }
}, { dependsOn: cephCluster });

const blockStorageClass = new k8s.storage.v1.StorageClass("rook-block-sc", {
  metadata: {
    name: "rook-ceph-block"
  },
  provisioner: "rook-ceph.rbd.csi.ceph.com",
  reclaimPolicy: "Retain",
  allowVolumeExpansion: true,
  parameters: {
    clusterID: namespace,
    pool: "replicapool",
    imageFormat: "2",
    imageFeatures: "layering",
    "csi.storage.k8s.io/provisioner-secret-name": "rook-csi-rbd-provisioner",
    "csi.storage.k8s.io/provisioner-secret-namespace": namespace,
    "csi.storage.k8s.io/controller-expand-secret-name": "rook-csi-rbd-provisioner",
    "csi.storage.k8s.io/controller-expand-secret-namespace": namespace,
    "csi.storage.k8s.io/node-stage-secret-name": "rook-csi-rbd-node",
    "csi.storage.k8s.io/node-stage-secret-namespace": namespace
  }
}, { dependsOn: blockPool });
```

## Creating Object Storage

```typescript
const objectStore = new k8s.apiextensions.CustomResource("object-store", {
  apiVersion: "ceph.rook.io/v1",
  kind: "CephObjectStore",
  metadata: {
    name: "my-store",
    namespace: namespace
  },
  spec: {
    metadataPool: { replicated: { size: replicaCount } },
    dataPool: { replicated: { size: replicaCount } },
    gateway: {
      port: 80,
      instances: 2
    }
  }
}, { dependsOn: cephCluster });

// Export the object store endpoint
export const objectStoreEndpoint = pulumi.interpolate`http://rook-ceph-rgw-my-store.${namespace}.svc:80`;
```

## Pulumi Config and Deployment

```yaml
# Pulumi.dev.yaml
config:
  rook-ceph-deployment:namespace: rook-ceph
  rook-ceph-deployment:cephVersion: v18.2.0
  rook-ceph-deployment:replicas: "3"
```

```bash
# Deploy
pulumi up

# Preview changes
pulumi preview

# Destroy
pulumi destroy

# Show outputs
pulumi stack output objectStoreEndpoint
```

## Summary

Pulumi's TypeScript SDK provides a type-safe, programmatic approach to deploying Rook-Ceph on Kubernetes. Unlike YAML-based tools, Pulumi lets you use variables, loops, and conditionals to build dynamic Ceph configurations, while its state management tracks the full lifecycle of all resources from the Rook operator to individual CephBlockPools and StorageClasses.
