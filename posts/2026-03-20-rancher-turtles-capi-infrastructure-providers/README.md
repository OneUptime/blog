# How to Configure CAPI Infrastructure Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Kubernetes, Infrastructure, Cloud

Description: Configure Cluster API infrastructure providers including AWS, Azure, vSphere, and Docker for multi-cloud Kubernetes provisioning.

## Introduction

How to Configure CAPI Infrastructure Providers is an important aspect of managing Kubernetes clusters with Rancher Turtles and Cluster API. Rancher Turtles manages infrastructure providers declaratively through the `CAPIProvider` custom resource, while the exact cluster templates and required variables remain provider-specific.

## Prerequisites

- Rancher Turtles installed and configured
- kubectl access to the management cluster
- Appropriate cloud provider credentials (if applicable)
- Cluster API core components available on the management cluster

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher to provide a unified, declarative approach to Kubernetes cluster lifecycle management. This guide walks through configuring infrastructure providers with `CAPIProvider` resources and verifying that the resulting provider controllers are ready to use.

## Step 1: Prepare Your Environment

```bash
# Verify Rancher Turtles is running

kubectl get pods -n cattle-turtles-system

# Check configured Rancher Turtles provider objects
kubectl get capiproviders.turtles-capi.cattle.io -A

# Verify management cluster connectivity
kubectl cluster-info
```

## Step 2: Configure Resources

```yaml
# Example Rancher Turtles CAPIProvider configuration for AWS.
# For Azure or vSphere, keep `type: infrastructure` and change the provider name and credentials.
# For Docker, use `name: docker` and omit cloud-specific credentials.
apiVersion: turtles-capi.cattle.io/v1alpha1
kind: CAPIProvider
metadata:
  name: aws
  namespace: cattle-turtles-system
spec:
  name: aws
  type: infrastructure
  credentials:
    rancherCloudCredential: aws-creds
  configSecret:
    name: aws-config
```

```bash
# Apply the configuration
kubectl apply -f provider-config.yaml

# Monitor progress
kubectl get capiproviders.turtles-capi.cattle.io aws -n cattle-turtles-system --watch
```

## Step 3: Verify the Configuration

```bash
# Check configured provider objects
kubectl get capiproviders.turtles-capi.cattle.io -A

# Describe the provider for detailed status
kubectl describe capiproviders.turtles-capi.cattle.io aws -n cattle-turtles-system

# View the generated Cluster API Operator infrastructure provider
kubectl get infrastructureproviders.operator.cluster.x-k8s.io -A

# Check the provider controller pods
# Replace `capa-system` for other providers such as `capz-system` or `capv-system`.
kubectl get pods -n capa-system
```

## Step 4: Validate in Rancher UI

1. Navigate to **Cluster Management** in Rancher
2. Open the local management cluster
3. Verify the Rancher Turtles extension and related workloads are healthy
4. After provisioning a downstream cluster with this provider, verify the cluster appears in Rancher once it reaches `ControlPlaneAvailable`

## Common Operations

```bash
# Replace <provider-version> with the version you want to pin
kubectl patch capiproviders.turtles-capi.cattle.io aws -n cattle-turtles-system --type merge -p '{"spec":{"version":"<provider-version>"}}'

# View the provider configuration
kubectl get capiproviders.turtles-capi.cattle.io aws -n cattle-turtles-system -o yaml

# Check generated infrastructure provider objects
kubectl get infrastructureproviders.operator.cluster.x-k8s.io -A

# Remove the provider configuration
kubectl delete capiproviders.turtles-capi.cattle.io aws -n cattle-turtles-system
```

## Troubleshooting

```bash
# Check Turtles controller logs
kubectl logs -l control-plane=controller-manager -n cattle-turtles-system --follow

# Check infrastructure provider controller logs
# Replace `capa-system` for other providers such as `capz-system` or `capv-system`.
kubectl logs -l control-plane=controller-manager -n capa-system --since=30m

# Describe the CAPIProvider for reconciliation errors
kubectl describe capiproviders.turtles-capi.cattle.io aws -n cattle-turtles-system

# Get events for the provider
kubectl get events -n cattle-turtles-system --field-selector involvedObject.name=aws --sort-by=.lastTimestamp
```

## Conclusion

How to Configure CAPI Infrastructure Providers with Rancher Turtles enables a declarative, Kubernetes-native approach to infrastructure management. By defining infrastructure providers with `CAPIProvider` resources and then using provider-specific cluster templates or ClusterClasses, you get a unified platform for managing Kubernetes clusters across different environments.
