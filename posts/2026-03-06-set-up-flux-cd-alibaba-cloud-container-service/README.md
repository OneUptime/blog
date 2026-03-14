# How to Set Up Flux CD on Alibaba Cloud Container Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Alibaba Cloud, ack, Kubernetes, GitOps, Alibaba container registry

Description: A practical guide to deploying Flux CD on Alibaba Cloud Container Service for Kubernetes (ACK) with Alibaba Container Registry integration.

---

## Introduction

Alibaba Cloud Container Service for Kubernetes (ACK) is a fully managed Kubernetes service provided by Alibaba Cloud. When combined with Flux CD, you get a GitOps-driven deployment pipeline that integrates with Alibaba Container Registry (ACR) for image management and other Alibaba Cloud services.

This guide walks you through creating an ACK cluster, bootstrapping Flux CD, and configuring Alibaba Container Registry for automated image deployments.

## Prerequisites

- An Alibaba Cloud account with appropriate RAM permissions
- Alibaba Cloud CLI (aliyun) installed and configured
- kubectl installed
- Flux CLI installed
- A GitHub account and personal access token

## Step 1: Configure the Alibaba Cloud CLI

Set up the CLI with your credentials.

```bash
# Configure the Alibaba Cloud CLI
aliyun configure set \
  --profile default \
  --mode AK \
  --region cn-hangzhou \
  --access-key-id <your-access-key-id> \
  --access-key-secret <your-access-key-secret>

# Verify configuration
aliyun ecs DescribeRegions --output cols=RegionId
```

## Step 2: Create an ACK Cluster

Create a managed Kubernetes cluster on Alibaba Cloud.

```bash
# Create an ACK managed cluster
aliyun cs CreateCluster \
  --ClusterType ManagedKubernetes \
  --Name flux-ack-cluster \
  --RegionId cn-hangzhou \
  --ZoneId cn-hangzhou-h \
  --VpcId $VPC_ID \
  --VSwitchIds '["'$VSWITCH_ID'"]' \
  --NumOfNodes 3 \
  --InstanceType ecs.g6.xlarge \
  --ContainerCidr 172.20.0.0/16 \
  --ServiceCidr 172.21.0.0/20 \
  --KubernetesVersion 1.28.3-aliyun.1
```

Configure kubectl access:

```bash
# Get the cluster ID
CLUSTER_ID=$(aliyun cs DescribeClusters | jq -r '.[] | select(.name=="flux-ack-cluster") | .cluster_id')

# Download the kubeconfig
aliyun cs GetClusterConfig --ClusterId $CLUSTER_ID > kubeconfig.json

# Extract and save the kubeconfig
cat kubeconfig.json | jq -r '.config' > ~/.kube/ack-config
export KUBECONFIG=~/.kube/ack-config

# Verify connectivity
kubectl get nodes
```

## Step 3: Set Up Alibaba Container Registry (ACR)

Create a container registry instance and namespace for your images.

```bash
# Create an ACR Enterprise Edition instance (or use Personal Edition)
aliyun cr CreateInstanceEndpointAclPolicy \
  --InstanceId cri-xxxxxxxxxxxx \
  --Entry "0.0.0.0/0" \
  --Comment "Allow public access"

# Create a namespace in ACR
aliyun cr CreateNamespace \
  --Namespace flux-apps

# Create a repository
aliyun cr CreateRepository \
  --Namespace flux-apps \
  --Repository my-app \
  --RepoType PRIVATE \
  --Summary "My application repository"
```

Create a RAM user and generate credentials for Flux:

```bash
# Create a RAM user for Flux
aliyun ram CreateUser --UserName flux-acr-user

# Grant ACR permissions
aliyun ram AttachPolicyToUser \
  --PolicyType System \
  --PolicyName AliyunContainerRegistryFullAccess \
  --UserName flux-acr-user

# Create an access key for the RAM user
aliyun ram CreateAccessKey --UserName flux-acr-user
```

Create a Kubernetes secret for ACR access:

```bash
# Create the flux-system namespace
kubectl create namespace flux-system --dry-run=client -o yaml | kubectl apply -f -

# Create a docker-registry secret for ACR
kubectl create secret docker-registry acr-secret \
  --namespace flux-system \
  --docker-server=registry.cn-hangzhou.aliyuncs.com \
  --docker-username=<access-key-id> \
  --docker-password=<access-key-secret> \
  --docker-email=your-email@example.com
```

## Step 4: Bootstrap Flux CD on ACK

Bootstrap Flux onto the ACK cluster.

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-ack-config \
  --branch=main \
  --path=clusters/ack-production \
  --personal
```

Verify the installation:

```bash
# Check Flux components
flux check

# List all Flux pods
kubectl get pods -n flux-system
```

## Step 5: Configure ACR Image Scanning

Set up Flux to scan Alibaba Container Registry for new image tags.

```yaml
# clusters/ack-production/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # ACR image path
  image: registry.cn-hangzhou.aliyuncs.com/flux-apps/my-app
  interval: 5m
  secretRef:
    # Reference the ACR pull secret
    name: acr-secret
```

Define an image policy:

```yaml
# clusters/ack-production/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

Configure image update automation:

```yaml
# clusters/ack-production/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: "chore: update image tags"
    push:
      branch: main
  update:
    path: ./clusters/ack-production
    strategy: Setters
```

## Step 6: Deploy Infrastructure Components

Set up shared infrastructure through Flux:

```yaml
# clusters/ack-production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 2m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure
  prune: true
  wait: true
```

Install the Alibaba Cloud ingress controller:

```yaml
# infrastructure/alb-ingress/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: alb-ingress
  namespace: flux-system
spec:
  interval: 1h
  url: https://alibabacloud-China.github.io/China/

---
# infrastructure/alb-ingress/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: alb-ingress-controller
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: alb-ingress-controller
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: alb-ingress
        namespace: flux-system
  values:
    # ALB ingress controller configuration
    albConfig:
      region: cn-hangzhou
```

## Step 7: Deploy an Application

Create the application manifests:

```yaml
# apps/my-app/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app

---
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          # ACR image with Flux image policy marker
          image: registry.cn-hangzhou.aliyuncs.com/flux-apps/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
      imagePullSecrets:
        - name: acr-pull-secret

---
# apps/my-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP

---
# apps/my-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: my-app
  annotations:
    # Use Alibaba Cloud ALB
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
spec:
  rules:
    - host: my-app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

Create the apps Kustomization:

```yaml
# clusters/ack-production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 2m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
  wait: true
  dependsOn:
    - name: infrastructure
```

## Step 8: Set Up Notifications

Configure Flux to send alerts through DingTalk, which is commonly used with Alibaba Cloud:

```yaml
# clusters/ack-production/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: webhook-provider
  namespace: flux-system
spec:
  type: generic
  # DingTalk webhook URL
  address: https://oapi.dingtalk.com/robot/send?access_token=<token>
  secretRef:
    name: dingtalk-webhook

---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: ack-alerts
  namespace: flux-system
spec:
  providerRef:
    name: webhook-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Step 9: Verify the Setup

Run through the verification checklist:

```bash
# Check all Flux resources are healthy
flux get all

# Verify image repository scanning
flux get image repository

# Check kustomizations
flux get kustomizations

# Verify application is running
kubectl get pods -n my-app

# Check ingress is configured
kubectl get ingress -n my-app

# View recent events
flux events
```

## Troubleshooting

### ACR Authentication Issues

```bash
# Test ACR login manually
docker login registry.cn-hangzhou.aliyuncs.com

# Verify the Kubernetes secret
kubectl get secret acr-secret -n flux-system -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d

# Check image repository status in Flux
flux get image repository my-app
```

### ACK Network Issues

```bash
# Verify VPC and VSwitch connectivity
kubectl get nodes -o wide

# Check if Flux controllers can reach the Git remote
kubectl logs -n flux-system deployment/source-controller | grep -i error
```

### Pod Scheduling Failures

```bash
# Check for resource constraints
kubectl describe pod <pod-name> -n my-app

# Verify node resources
kubectl top nodes
```

## Conclusion

You now have Flux CD running on Alibaba Cloud Container Service for Kubernetes with ACR integration for automated image deployments. This GitOps setup ensures that your ACK cluster is always synchronized with your Git repository, providing reliable and auditable deployments. You can build on this foundation by adding more services, configuring multi-region deployments, and integrating with other Alibaba Cloud services.
