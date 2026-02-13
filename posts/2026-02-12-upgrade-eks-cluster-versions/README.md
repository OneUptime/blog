# How to Upgrade EKS Cluster Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, Upgrades, DevOps

Description: A comprehensive guide to upgrading Amazon EKS cluster versions safely, including control plane upgrades, node group updates, and add-on compatibility checks.

---

Kubernetes releases a new minor version roughly every four months, and AWS supports each EKS version for about 14 months. That means upgrades aren't optional - they're a regular part of running EKS. Skip too many versions and you'll end up on an unsupported release with no security patches. Even worse, EKS will eventually auto-upgrade your cluster, and you probably don't want that to happen on AWS's schedule rather than yours.

This guide covers the full upgrade process: planning, control plane upgrade, add-on updates, and node group rolling updates. Done right, it's a zero-downtime operation.

## Understanding EKS Version Support

EKS follows an extended support model. Each version goes through these phases:

- **Standard support** - 14 months from release, included in EKS pricing
- **Extended support** - additional 12 months after standard support ends, with an extra per-cluster fee
- **End of life** - cluster is auto-upgraded to the next supported version

You can only upgrade one minor version at a time. So going from 1.27 to 1.29 requires two upgrades: 1.27 to 1.28, then 1.28 to 1.29.

```mermaid
flowchart LR
    A[Check Current Version] --> B[Review Changelog]
    B --> C[Test in Staging]
    C --> D[Upgrade Control Plane]
    D --> E[Update Add-ons]
    E --> F[Upgrade Node Groups]
    F --> G[Verify Applications]
```

## Step 1: Check Your Current Version

```bash
# Check current cluster version
aws eks describe-cluster --name my-cluster \
  --query "cluster.version" --output text

# Check available upgrade versions
aws eks describe-cluster --name my-cluster \
  --query "cluster.{Version:version,PlatformVersion:platformVersion}"

# See what Kubernetes versions EKS currently supports
aws eks describe-addon-versions --query "addons[0].addonVersions[*].compatibilities[*].clusterVersion" --output text | tr '\t' '\n' | sort -u
```

## Step 2: Review the Changelog

Before upgrading, read the Kubernetes changelog for the target version. Pay attention to:

- Deprecated APIs that are being removed
- Changes to default behaviors
- New features that affect your workloads

Check for deprecated APIs in your cluster:

```bash
# Install kubent (kube-no-trouble) to find deprecated APIs
brew install kubent

# Scan your cluster for deprecated/removed API usage
kubent
```

This is critical. If your manifests use removed APIs, your workloads will break after the upgrade.

## Step 3: Check Add-on Compatibility

EKS add-ons need to be compatible with your target Kubernetes version. Check each one:

```bash
# List current add-ons and their versions
aws eks list-addons --cluster-name my-cluster --output table

# Check compatible versions for a specific add-on
aws eks describe-addon-versions \
  --addon-name vpc-cni \
  --kubernetes-version 1.29 \
  --query "addons[0].addonVersions[*].{Version:addonVersion,Default:compatibilities[0].defaultVersion}" \
  --output table
```

Common add-ons to check:
- vpc-cni
- coredns
- kube-proxy
- aws-ebs-csi-driver
- aws-efs-csi-driver

## Step 4: Upgrade the Control Plane

The control plane upgrade is managed by AWS and happens in-place with zero downtime. During the upgrade, you might experience brief API server unavailability (a few seconds), but your running workloads aren't affected.

```bash
# Upgrade the EKS control plane
aws eks update-cluster-version \
  --name my-cluster \
  --kubernetes-version 1.29

# Monitor the upgrade progress
aws eks describe-update \
  --name my-cluster \
  --update-id UPDATE_ID_FROM_PREVIOUS_COMMAND
```

The control plane upgrade typically takes 20-40 minutes. You can also watch it:

```bash
# Poll for upgrade completion
aws eks wait cluster-active --name my-cluster
echo "Control plane upgrade complete"
```

Or with eksctl:

```bash
# Upgrade control plane with eksctl
eksctl upgrade cluster --name my-cluster --version 1.29 --approve
```

## Step 5: Update Add-ons

After the control plane is upgraded, update your add-ons to versions compatible with the new Kubernetes version:

```bash
# Update vpc-cni add-on
aws eks update-addon \
  --cluster-name my-cluster \
  --addon-name vpc-cni \
  --addon-version v1.16.0-eksbuild.1 \
  --resolve-conflicts OVERWRITE

# Update coredns
aws eks update-addon \
  --cluster-name my-cluster \
  --addon-name coredns \
  --addon-version v1.11.1-eksbuild.6 \
  --resolve-conflicts OVERWRITE

# Update kube-proxy
aws eks update-addon \
  --cluster-name my-cluster \
  --addon-name kube-proxy \
  --addon-version v1.29.0-eksbuild.3 \
  --resolve-conflicts OVERWRITE
```

Verify the add-on updates:

```bash
# Check add-on status
aws eks describe-addon --cluster-name my-cluster --addon-name vpc-cni \
  --query "addon.{Name:addonName,Version:addonVersion,Status:status}"
```

## Step 6: Upgrade Managed Node Groups

Node groups need to run an AMI that's compatible with the new Kubernetes version. For managed node groups, AWS handles the rolling update:

```bash
# Update the managed node group
aws eks update-nodegroup-version \
  --cluster-name my-cluster \
  --nodegroup-name general-workload

# Monitor the update
aws eks describe-nodegroup \
  --cluster-name my-cluster \
  --nodegroup-name general-workload \
  --query "nodegroup.{Status:status,Version:version,ReleaseVersion:releaseVersion}"
```

The rolling update process:
1. AWS launches new nodes with the updated AMI
2. Cordons old nodes (prevents new pods from scheduling)
3. Drains old nodes (gracefully evicts pods)
4. Terminates old nodes once pods are rescheduled

You can control how aggressive the update is:

```bash
# Update with custom settings for faster rollout
aws eks update-nodegroup-version \
  --cluster-name my-cluster \
  --nodegroup-name general-workload \
  --update-config '{"maxUnavailable": 2}'
```

With eksctl:

```bash
# Upgrade node groups with eksctl
eksctl upgrade nodegroup \
  --cluster my-cluster \
  --name general-workload \
  --kubernetes-version 1.29
```

## Step 7: Update Self-Managed Components

If you're running the [Cluster Autoscaler](https://oneuptime.com/blog/post/2026-02-12-configure-eks-cluster-autoscaler/view), [Karpenter](https://oneuptime.com/blog/post/2026-02-12-use-karpenter-for-eks-node-provisioning/view), or other controllers, update them to versions compatible with the new Kubernetes version.

```bash
# Update Cluster Autoscaler image tag to match new K8s version
kubectl set image deployment/cluster-autoscaler \
  -n kube-system \
  cluster-autoscaler=registry.k8s.io/autoscaling/cluster-autoscaler:v1.29.0
```

## Step 8: Verify the Upgrade

Run a thorough check after the upgrade:

```bash
# Verify cluster version
kubectl version

# Check all nodes are running the new version
kubectl get nodes -o wide

# Verify all pods are running
kubectl get pods -A | grep -v Running | grep -v Completed

# Check for any failing deployments
kubectl get deployments -A -o wide

# Run a quick smoke test
kubectl run test-pod --image=nginx --restart=Never
kubectl wait --for=condition=Ready pod/test-pod --timeout=60s
kubectl delete pod test-pod
```

## Pre-Upgrade Checklist

Before starting any upgrade:

1. Review the Kubernetes changelog for breaking changes
2. Run kubent to find deprecated API usage
3. Test the upgrade in a staging cluster first
4. Ensure PodDisruptionBudgets are configured for critical workloads
5. Verify backup and disaster recovery procedures
6. Schedule the upgrade during a low-traffic window
7. Notify your team and stakeholders
8. Have a rollback plan (though control plane rollbacks aren't possible)

## Automation with eksctl

For repeatable upgrades, eksctl can handle the entire process from a config file:

```yaml
# cluster-config.yaml for upgrade
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: my-cluster
  region: us-west-2
  version: "1.29"

managedNodeGroups:
  - name: general-workload
    instanceType: m5.xlarge
    minSize: 2
    maxSize: 10
    desiredCapacity: 3
```

```bash
# Upgrade everything using the config
eksctl upgrade cluster -f cluster-config.yaml --approve
```

EKS upgrades are routine maintenance, not emergencies. By keeping a regular upgrade cadence - ideally upgrading within a month or two of a new version becoming available - each upgrade stays small and manageable. Wait too long and you'll face a stack of breaking changes all at once.
