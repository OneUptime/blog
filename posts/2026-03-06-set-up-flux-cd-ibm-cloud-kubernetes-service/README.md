# How to Set Up Flux CD on IBM Cloud Kubernetes Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, IBM Cloud, IKS, Kubernetes, GitOps, Ibm container registry

Description: A complete guide to deploying Flux CD on IBM Cloud Kubernetes Service (IKS) with IBM Container Registry integration for a production-ready GitOps workflow.

---

## Introduction

IBM Cloud Kubernetes Service (IKS) provides a managed Kubernetes environment on IBM Cloud. By integrating Flux CD with IKS, you can establish a GitOps workflow that automates deployments, tracks changes through Git, and leverages IBM Cloud services such as IBM Container Registry (ICR) for image management.

This guide covers creating an IKS cluster, bootstrapping Flux CD, and configuring IBM Container Registry as your image source.

## Prerequisites

- An IBM Cloud account with appropriate IAM permissions
- IBM Cloud CLI installed with the container-service and container-registry plugins
- kubectl installed
- Flux CLI installed
- A GitHub account and personal access token

## Step 1: Set Up the IBM Cloud CLI

Install and configure the IBM Cloud CLI with the required plugins.

```bash
# Log in to IBM Cloud
ibmcloud login --sso

# Install the Kubernetes Service plugin
ibmcloud plugin install container-service

# Install the Container Registry plugin
ibmcloud plugin install container-registry

# Set the target region
ibmcloud target -r us-south
```

## Step 2: Create an IKS Cluster

Create a Kubernetes cluster on IBM Cloud.

```bash
# Create a VPC-based IKS cluster
ibmcloud ks cluster create vpc-gen2 \
  --name flux-iks-cluster \
  --zone us-south-1 \
  --vpc-id $VPC_ID \
  --subnet-id $SUBNET_ID \
  --flavor bx2.4x16 \
  --workers 3 \
  --version 1.28

# Wait for the cluster to be ready
ibmcloud ks cluster ls

# Download the kubeconfig
ibmcloud ks cluster config --cluster flux-iks-cluster

# Verify connectivity
kubectl get nodes
```

## Step 3: Set Up IBM Container Registry

IBM Container Registry (ICR) provides a private, managed registry for your container images.

```bash
# Create a namespace in ICR
ibmcloud cr namespace-add flux-apps

# Log in to ICR
ibmcloud cr login

# Verify the namespace was created
ibmcloud cr namespace-list
```

Create an API key for Flux to access ICR:

```bash
# Create an API key for Flux
ibmcloud iam api-key-create flux-icr-key \
  --description "API key for Flux CD to access ICR" \
  --file flux-icr-key.json
```

Create a Kubernetes pull secret for ICR:

```bash
# Create the flux-system namespace first if it does not exist
kubectl create namespace flux-system --dry-run=client -o yaml | kubectl apply -f -

# Create a docker-registry secret for ICR
kubectl create secret docker-registry icr-secret \
  --namespace flux-system \
  --docker-server=us.icr.io \
  --docker-username=iamapikey \
  --docker-password="$(jq -r .apikey flux-icr-key.json)" \
  --docker-email=your-email@example.com
```

## Step 4: Bootstrap Flux CD

Bootstrap Flux onto the IKS cluster using GitHub as the Git provider.

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-iks-config \
  --branch=main \
  --path=clusters/iks-production \
  --personal
```

Verify the bootstrap completed successfully:

```bash
# Run the Flux pre-flight checks
flux check

# List all Flux components
kubectl get pods -n flux-system
```

Expected output:

```text
NAME                                       READY   STATUS    RESTARTS   AGE
helm-controller-xxx                        1/1     Running   0          2m
kustomize-controller-xxx                   1/1     Running   0          2m
notification-controller-xxx                1/1     Running   0          2m
source-controller-xxx                      1/1     Running   0          2m
```

## Step 5: Configure IBM Container Registry with Flux

Set up Flux to scan ICR for new image tags.

```yaml
# clusters/iks-production/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # ICR image path
  image: us.icr.io/flux-apps/my-app
  interval: 5m
  secretRef:
    # Reference the ICR pull secret
    name: icr-secret
```

Define an image update policy:

```yaml
# clusters/iks-production/image-policy.yaml
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
      # Track stable releases only
      range: ">=1.0.0"
```

Set up image update automation to commit tag changes back to Git:

```yaml
# clusters/iks-production/image-update-automation.yaml
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
      messageTemplate: "chore: update image tags [ci skip]"
    push:
      branch: main
  update:
    path: ./clusters/iks-production
    strategy: Setters
```

## Step 6: Deploy Infrastructure Components

Create a Kustomization for shared infrastructure:

```yaml
# clusters/iks-production/infrastructure.yaml
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
  timeout: 5m
```

Install an ingress controller via Helm:

```yaml
# infrastructure/ingress-nginx/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes.github.io/ingress-nginx

---
# infrastructure/ingress-nginx/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      # Use IBM Cloud load balancer
      service:
        type: LoadBalancer
        annotations:
          service.kubernetes.io/ibm-load-balancer-cloud-provider-ip-type: public
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
          # Image from ICR - Flux will update via image automation
          image: us.icr.io/flux-apps/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
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
        - name: icr-pull-secret

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
```

Create the apps Kustomization:

```yaml
# clusters/iks-production/apps.yaml
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
  # Ensure infrastructure is deployed first
  dependsOn:
    - name: infrastructure
```

## Step 8: Set Up Monitoring and Alerts

Configure Flux notifications for deployment events:

```yaml
# clusters/iks-production/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  channel: iks-deployments
  secretRef:
    name: slack-webhook

---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: iks-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: ImageRepository
      name: "*"
```

## Step 9: Verify the Complete Setup

Run through the verification steps:

```bash
# Check all Flux resources
flux get all

# Verify image scanning is working
flux get image repository

# Verify kustomizations are reconciled
flux get kustomizations

# Check application pods are running
kubectl get pods -n my-app

# View Flux events for recent activity
flux events --for Kustomization/apps
```

## Troubleshooting

### ICR Pull Failures

If pods fail to pull images from ICR:

```bash
# Verify the pull secret is in the correct namespace
kubectl get secrets -n my-app | grep icr

# Test ICR login manually
ibmcloud cr login
docker pull us.icr.io/flux-apps/my-app:latest

# Check ICR namespace quotas
ibmcloud cr quota
```

### IKS RBAC Issues

If Flux controllers have permission issues:

```bash
# Verify Flux service accounts have correct bindings
kubectl get clusterrolebindings | grep flux

# Check controller logs for RBAC errors
kubectl logs -n flux-system deployment/kustomize-controller | grep -i forbidden
```

### Flux Reconciliation Stuck

If resources are not reconciling:

```bash
# Force a reconciliation
flux reconcile kustomization apps --with-source

# Check source controller for Git access issues
kubectl logs -n flux-system deployment/source-controller
```

## Conclusion

You now have a fully operational Flux CD deployment on IBM Cloud Kubernetes Service. This setup provides automated GitOps-based deployments, image scanning from IBM Container Registry, and notification alerts for deployment events. You can extend this foundation by adding more applications, Helm releases, and multi-cluster configurations as your infrastructure needs grow.
