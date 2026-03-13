# How to Deploy AWS App Mesh Controller with Flux on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, App Mesh, Service Mesh, Helm

Description: Learn how to deploy and manage the AWS App Mesh Controller on Amazon EKS using Flux GitOps workflows for automated service mesh configuration.

---

AWS App Mesh is a fully managed service mesh that provides application-level networking so your services can communicate with each other across multiple types of compute infrastructure. By deploying the App Mesh Controller through Flux on EKS, you gain a declarative, Git-driven approach to managing your service mesh lifecycle. This guide walks through the entire setup process.

## Prerequisites

Before you begin, make sure you have the following tools installed and configured:

- An existing EKS cluster (version 1.25 or later)
- Flux CLI installed and bootstrapped on your cluster
- AWS CLI configured with appropriate permissions
- kubectl configured to access your EKS cluster

## Step 1: Create an IAM Role for the App Mesh Controller

The App Mesh Controller needs IAM permissions to manage App Mesh resources. Create an IAM policy and associate it with a Kubernetes service account using IRSA (IAM Roles for Service Accounts).

```bash
eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=appmesh-system \
  --name=appmesh-controller \
  --attach-policy-arn=arn:aws:iam::aws:policy/AWSCloudMapFullAccess \
  --attach-policy-arn=arn:aws:iam::aws:policy/AWSAppMeshFullAccess \
  --override-existing-serviceaccounts \
  --approve
```

## Step 2: Add the App Mesh Helm Repository as a Flux Source

Create a `HelmRepository` resource that points to the EKS Helm chart repository where the App Mesh Controller chart is hosted.

```yaml
# clusters/my-cluster/appmesh/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: eks-charts
  namespace: flux-system
spec:
  interval: 24h
  url: https://aws.github.io/eks-charts
```

Apply this to your Git repository so Flux picks it up automatically.

## Step 3: Create the App Mesh Namespace

Define the namespace where the App Mesh Controller will run.

```yaml
# clusters/my-cluster/appmesh/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: appmesh-system
  labels:
    appmesh.k8s.aws/sidecarInjectorWebhook: enabled
```

## Step 4: Create the HelmRelease for App Mesh Controller

Define the `HelmRelease` resource that tells Flux how to install and configure the App Mesh Controller.

```yaml
# clusters/my-cluster/appmesh/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: appmesh-controller
  namespace: appmesh-system
spec:
  interval: 1h
  chart:
    spec:
      chart: appmesh-controller
      version: "1.12.*"
      sourceRef:
        kind: HelmRepository
        name: eks-charts
        namespace: flux-system
      interval: 24h
  values:
    region: us-west-2
    serviceAccount:
      create: false
      name: appmesh-controller
    tracing:
      enabled: true
      provider: x-ray
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
```

## Step 5: Create a Mesh Resource

Once the controller is running, you can define a Mesh custom resource that the controller will reconcile into an actual AWS App Mesh mesh.

```yaml
# clusters/my-cluster/appmesh/mesh.yaml
apiVersion: appmesh.k8s.aws/v1beta2
kind: Mesh
metadata:
  name: my-application-mesh
spec:
  namespaceSelector:
    matchLabels:
      appmesh.k8s.aws/sidecarInjectorWebhook: enabled
  egressFilter:
    type: ALLOW_ALL
```

## Step 6: Create a Virtual Node and Virtual Service

Define the virtual nodes and services that represent your application components inside the mesh.

```yaml
# clusters/my-cluster/appmesh/virtual-node.yaml
apiVersion: appmesh.k8s.aws/v1beta2
kind: VirtualNode
metadata:
  name: my-app
  namespace: my-app-ns
spec:
  podSelector:
    matchLabels:
      app: my-app
  listeners:
    - portMapping:
        port: 8080
        protocol: http
  serviceDiscovery:
    dns:
      hostname: my-app.my-app-ns.svc.cluster.local
---
apiVersion: appmesh.k8s.aws/v1beta2
kind: VirtualService
metadata:
  name: my-app
  namespace: my-app-ns
spec:
  awsName: my-app.my-app-ns.svc.cluster.local
  provider:
    virtualNode:
      virtualNodeRef:
        name: my-app
```

## Step 7: Commit and Push to Git

Push all the manifests to your Git repository. Flux will detect the changes and apply them to your cluster.

```bash
git add -A
git commit -m "Add App Mesh Controller managed by Flux"
git push origin main
```

## Step 8: Verify the Deployment

Check that Flux has successfully reconciled the resources and the controller is running.

```bash
flux get helmreleases -n appmesh-system

kubectl get pods -n appmesh-system

kubectl get meshes
```

You should see the App Mesh Controller pod running and the mesh resource in a healthy state.

## Enabling Sidecar Injection

To enable automatic Envoy sidecar injection for a namespace, label it accordingly:

```bash
kubectl label namespace my-app-ns appmesh.k8s.aws/sidecarInjectorWebhook=enabled
```

Any new pods created in that namespace will automatically get an Envoy sidecar proxy attached.

## Upgrading the Controller

Since Flux manages the HelmRelease, upgrading is straightforward. Update the version constraint in your HelmRelease manifest:

```yaml
spec:
  chart:
    spec:
      version: "1.13.*"
```

Commit and push the change. Flux will perform the upgrade automatically during its next reconciliation cycle.

## Troubleshooting

If the controller fails to start, check the following:

```bash
kubectl logs -n appmesh-system deployment/appmesh-controller

flux get helmreleases -n appmesh-system

kubectl describe helmrelease appmesh-controller -n appmesh-system
```

Common issues include incorrect IAM role configuration, missing CRDs, or version incompatibilities between the controller and your EKS cluster version.

## Conclusion

Deploying the AWS App Mesh Controller with Flux on EKS gives you a fully declarative, GitOps-driven approach to service mesh management. All mesh configuration lives in Git, making it auditable and reproducible. Flux handles the lifecycle of the controller itself, and the controller reconciles your mesh resources with the AWS App Mesh API. This combination provides a robust foundation for managing service-to-service communication in your EKS clusters.
