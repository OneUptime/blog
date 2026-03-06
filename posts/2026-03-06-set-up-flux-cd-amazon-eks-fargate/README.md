# How to Set Up Flux CD on Amazon EKS Fargate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, amazon eks, fargate, serverless, gitops, kubernetes, aws

Description: A step-by-step guide to deploying and running Flux CD controllers on Amazon EKS Fargate for a fully serverless GitOps workflow.

---

## Introduction

Amazon EKS Fargate allows you to run Kubernetes pods without managing EC2 instances. Running Flux CD on Fargate provides a fully serverless GitOps experience where you do not need to provision or manage any compute infrastructure for your GitOps controllers.

This guide covers creating Fargate profiles for Flux CD, deploying the controllers, and working around Fargate-specific limitations.

## Prerequisites

Before starting, ensure you have:

- AWS CLI configured with appropriate permissions
- eksctl installed (v0.150.0 or later)
- kubectl configured for your cluster
- Flux CLI installed (v2.0 or later)
- An EKS cluster with Fargate enabled

## Step 1: Create an EKS Cluster with Fargate

If you do not already have a Fargate-enabled cluster, create one.

```bash
# Create an EKS cluster with Fargate support
eksctl create cluster \
  --name flux-fargate-cluster \
  --region us-east-1 \
  --version 1.29 \
  --fargate
```

This creates a cluster with a default Fargate profile for the `default` and `kube-system` namespaces.

## Step 2: Create a Fargate Profile for Flux System

Flux CD runs its controllers in the `flux-system` namespace. You need a Fargate profile that matches this namespace.

```bash
# Create a Fargate profile for the flux-system namespace
eksctl create fargateprofile \
  --cluster flux-fargate-cluster \
  --name flux-system-profile \
  --namespace flux-system \
  --region us-east-1
```

Verify the profile was created:

```bash
# List all Fargate profiles for the cluster
aws eks list-fargate-profiles \
  --cluster-name flux-fargate-cluster \
  --region us-east-1
```

## Step 3: Create Fargate Profiles for Workload Namespaces

If your Flux-managed workloads run in other namespaces, create Fargate profiles for those as well.

```yaml
# fargate-profiles.yaml
# Use eksctl configuration for multiple profiles
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: flux-fargate-cluster
  region: us-east-1
fargateProfiles:
  # Profile for Flux CD controllers
  - name: flux-system-profile
    selectors:
      - namespace: flux-system
  # Profile for application workloads
  - name: apps-profile
    selectors:
      - namespace: production
        labels:
          env: production
      - namespace: staging
        labels:
          env: staging
  # Profile for monitoring tools
  - name: monitoring-profile
    selectors:
      - namespace: monitoring
```

Apply the profiles:

```bash
eksctl create fargateprofile -f fargate-profiles.yaml
```

## Step 4: Configure CoreDNS for Fargate

On Fargate-only clusters, CoreDNS needs to be patched to run on Fargate nodes.

```bash
# Remove the default compute type annotation from CoreDNS
kubectl patch deployment coredns \
  -n kube-system \
  --type json \
  -p='[{"op": "remove", "path": "/spec/template/metadata/annotations/eks.amazonaws.com~1compute-type"}]'

# Restart CoreDNS to schedule on Fargate
kubectl rollout restart deployment coredns -n kube-system

# Wait for CoreDNS to be ready
kubectl rollout status deployment coredns -n kube-system --timeout=120s
```

## Step 5: Bootstrap Flux CD on the Fargate Cluster

Bootstrap Flux CD using the Flux CLI. The controllers will automatically schedule on Fargate nodes thanks to the Fargate profile.

```bash
# Bootstrap Flux with a GitHub repository
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/fargate-cluster \
  --personal \
  --token-auth
```

## Step 6: Verify Flux Controllers on Fargate

Confirm that Flux controllers are running on Fargate nodes.

```bash
# Check that Flux pods are running
kubectl get pods -n flux-system -o wide

# Verify the nodes are Fargate instances
kubectl get nodes -o wide
# Fargate nodes have names starting with "fargate-"

# Check that each Flux pod is on a Fargate node
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}'
```

## Step 7: Handle Fargate Resource Limits

Fargate pods have specific resource configurations. Adjust Flux controller resources to match Fargate pod size options.

```yaml
# flux-system-patch.yaml
# Patch Flux controllers with appropriate resource requests
# Fargate rounds up to the nearest valid CPU/memory combination
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              # Fargate will allocate 0.5 vCPU and 1GB memory
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 500m
              memory: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 500m
              memory: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 500m
              memory: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 250m
              memory: 512Mi
```

## Step 8: Address Fargate Limitations

Fargate has several limitations that affect Flux CD. Here is how to handle them.

### No DaemonSets on Fargate

Fargate does not support DaemonSets. If you manage workloads that use DaemonSets, you need a mixed-mode cluster with both Fargate and managed node groups.

```bash
# Add a managed node group for workloads requiring DaemonSets
eksctl create nodegroup \
  --cluster flux-fargate-cluster \
  --name managed-workers \
  --node-type t3.medium \
  --nodes 2 \
  --region us-east-1
```

### No Persistent Volumes with EBS

Fargate does not support EBS-backed persistent volumes. Use EFS instead.

```yaml
# efs-storage-class.yaml
# Use EFS for persistent storage on Fargate
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef0
  directoryPerms: "700"
```

### Pod Startup Latency

Fargate pods take longer to start than EC2-based pods (typically 30-60 seconds). Adjust health check timeouts accordingly.

```yaml
# kustomization-with-timeout.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./apps
  prune: true
  # Increase timeout to account for Fargate startup latency
  timeout: 10m
  # Increase health check timeout
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
```

## Step 9: Configure Logging for Fargate

Fargate supports sending container logs to CloudWatch using the built-in Fluent Bit log router.

```yaml
# fargate-logging-config.yaml
# ConfigMap for Fargate Fluent Bit logging
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-logging
  namespace: flux-system
data:
  output.conf: |
    [OUTPUT]
        Name              cloudwatch_logs
        Match             *
        region            us-east-1
        log_group_name    /aws/eks/flux-fargate-cluster/flux-system
        log_stream_prefix flux-
        auto_create_group true
  filters.conf: |
    [FILTER]
        Name              parser
        Match             *
        Key_Name          log
        Parser            json
```

## Step 10: Set Up Network Policies

Fargate supports Kubernetes network policies for controlling traffic between pods.

```yaml
# flux-network-policy.yaml
# Restrict Flux controller network access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: flux-source-controller
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    # Allow DNS resolution
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow HTTPS for Git and Helm repos
    - to: []
      ports:
        - protocol: TCP
          port: 443
    # Allow HTTP for certain registries
    - to: []
      ports:
        - protocol: TCP
          port: 80
```

## Troubleshooting

```bash
# Issue: Pods stuck in "Pending" state
# Solution: Verify Fargate profile matches the namespace and labels
eksctl get fargateprofile --cluster flux-fargate-cluster

# Issue: DNS resolution failures
# Solution: Ensure CoreDNS is running on Fargate
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Issue: Slow reconciliation
# Solution: Check pod resource usage and adjust Fargate sizing
kubectl top pods -n flux-system

# Issue: Flux controllers not starting
# Solution: Check Fargate profile status and pod events
kubectl describe pod -n flux-system -l app=source-controller
```

## Conclusion

Running Flux CD on Amazon EKS Fargate provides a fully serverless GitOps experience. While Fargate introduces some constraints such as no DaemonSet support and slightly longer pod startup times, these are manageable with proper configuration. The key steps are ensuring Fargate profiles exist for all relevant namespaces, adjusting resource requests to match Fargate sizing, and accounting for startup latency in health check timeouts.
