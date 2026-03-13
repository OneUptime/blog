# How to Set Up Flux on EKS with Bottlerocket Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, Bottlerocket, Security, Container OS

Description: Learn how to set up Flux on Amazon EKS with Bottlerocket nodes for a minimal, secure, and GitOps-managed container operating system.

---

Bottlerocket is an open-source Linux-based operating system built by AWS specifically for running containers. It features a minimal footprint, automatic updates, and a hardened security posture. Running Flux on EKS with Bottlerocket nodes gives you a security-focused, GitOps-driven Kubernetes platform. This guide covers creating an EKS cluster with Bottlerocket nodes and bootstrapping Flux on it.

## Prerequisites

- AWS CLI configured with appropriate permissions
- eksctl installed (version 0.170 or later)
- Flux CLI installed
- kubectl installed
- A GitHub personal access token with repo permissions

## Why Bottlerocket for EKS

Bottlerocket offers several advantages over Amazon Linux or Ubuntu for EKS nodes:

- **Minimal attack surface**: No shell, package manager, or unnecessary software
- **Atomic updates**: The OS updates as a single unit with automatic rollback
- **Immutable root filesystem**: Read-only root prevents runtime modifications
- **API-driven configuration**: All settings managed through a structured API
- **SELinux enforced**: Mandatory access control enabled by default

## Step 1: Create an EKS Cluster with Bottlerocket Nodes

Use eksctl to create a cluster with Bottlerocket managed node groups.

```yaml
# cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: my-bottlerocket-cluster
  region: us-west-2
  version: "1.29"

managedNodeGroups:
  - name: bottlerocket-system
    instanceType: m6i.large
    desiredCapacity: 2
    minSize: 2
    maxSize: 4
    amiFamily: Bottlerocket
    bottlerocket:
      settings:
        kubernetes:
          maxPods: 58
        kernel:
          sysctl:
            "net.core.somaxconn": "16384"
    iam:
      withAddonPolicies:
        ebs: true
        efs: true
    labels:
      role: system
    tags:
      nodegroup-role: system

  - name: bottlerocket-workloads
    instanceType: m6i.xlarge
    desiredCapacity: 3
    minSize: 1
    maxSize: 10
    amiFamily: Bottlerocket
    bottlerocket:
      settings:
        kubernetes:
          maxPods: 110
          allowedUnsafeSysctls:
            - "net.core.somaxconn"
    labels:
      role: workloads
    tags:
      nodegroup-role: workloads
```

Create the cluster:

```bash
eksctl create cluster -f cluster-config.yaml
```

## Step 2: Verify Bottlerocket Nodes

Once the cluster is up, verify that nodes are running Bottlerocket:

```bash
kubectl get nodes -o wide

kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.osImage}{"\n"}{end}'
```

You should see the OS image reported as Bottlerocket.

## Step 3: Bootstrap Flux on the Cluster

Bootstrap Flux using the GitHub provider. This installs the Flux controllers and connects them to your Git repository.

```bash
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

flux bootstrap github \
  --owner="${GITHUB_USER}" \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-bottlerocket-cluster \
  --personal
```

## Step 4: Verify Flux Installation

Check that all Flux controllers are running on the Bottlerocket nodes:

```bash
flux check

kubectl get pods -n flux-system

kubectl get pods -n flux-system -o wide
```

All Flux pods should be running and ready.

## Step 5: Configure Bottlerocket Update Operator

Bottlerocket supports automated OS updates through the Bottlerocket Update Operator (brupop). Deploy it using Flux.

```yaml
# clusters/my-bottlerocket-cluster/brupop/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: brupop-bottlerocket-aws
```

```yaml
# clusters/my-bottlerocket-cluster/brupop/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bottlerocket
  namespace: flux-system
spec:
  interval: 24h
  url: https://bottlerocket-os.github.io/bottlerocket-update-operator
```

```yaml
# clusters/my-bottlerocket-cluster/brupop/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: bottlerocket-update-operator
  namespace: brupop-bottlerocket-aws
spec:
  interval: 1h
  chart:
    spec:
      chart: bottlerocket-update-operator
      version: "1.3.*"
      sourceRef:
        kind: HelmRepository
        name: bottlerocket
        namespace: flux-system
      interval: 24h
  values:
    scheduler:
      cron: "0 3 * * MON"
    maxUnavailable: 1
```

This configures the update operator to check for and apply Bottlerocket OS updates every Monday at 3 AM, updating one node at a time.

## Step 6: Deploy a Sample Application

Create a sample application deployment managed by Flux to verify everything works.

```yaml
# clusters/my-bottlerocket-cluster/apps/sample-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-sample
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-sample
  template:
    metadata:
      labels:
        app: nginx-sample
    spec:
      nodeSelector:
        role: workloads
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
          securityContext:
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 1000
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /var/cache/nginx
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
```

## Step 7: Set Up Pod Security Standards

Bottlerocket's hardened OS pairs well with Kubernetes Pod Security Standards. Configure namespace-level enforcement:

```yaml
# clusters/my-bottlerocket-cluster/policies/pod-security.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Step 8: Commit and Push

Push all configurations to Git:

```bash
git add -A
git commit -m "Set up Flux on EKS with Bottlerocket nodes"
git push origin main
```

## Accessing Bottlerocket Nodes for Debugging

Bottlerocket does not have SSH access by default. Use the SSM agent for debugging:

```bash
INSTANCE_ID=$(kubectl get nodes -o jsonpath='{.items[0].spec.providerID}' | cut -d'/' -f5)

aws ssm start-session \
  --target "${INSTANCE_ID}" \
  --document-name "AWS-StartInteractiveCommand" \
  --parameters command="enter-admin-container"
```

The admin container provides a shell environment for debugging without compromising the host OS security.

## Monitoring Bottlerocket Updates

Check the status of Bottlerocket update operations:

```bash
kubectl get bottlerocketshadows -A

kubectl describe bottlerocketshadow -n brupop-bottlerocket-aws
```

## Troubleshooting

If pods fail to schedule on Bottlerocket nodes, check for common issues:

```bash
# Check node conditions
kubectl describe nodes | grep -A5 "Conditions"

# Verify kubelet settings
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}: maxPods={.status.capacity.pods}{"\n"}{end}'

# Check Flux reconciliation
flux get kustomizations
```

Common issues with Bottlerocket nodes include reaching the maxPods limit (which depends on the instance type and CNI configuration) and volume mount permissions due to the read-only filesystem.

## Conclusion

Running Flux on EKS with Bottlerocket nodes provides a secure, minimal, and GitOps-driven Kubernetes platform. Bottlerocket reduces the attack surface of your nodes while Flux ensures all workload and infrastructure configuration is version-controlled and automatically reconciled. The Bottlerocket Update Operator, also managed by Flux, keeps your nodes patched with minimal disruption. This combination is well-suited for production environments where security and operational consistency are priorities.
