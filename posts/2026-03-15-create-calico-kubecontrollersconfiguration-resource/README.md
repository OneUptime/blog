# How to Create the Calico KubeControllersConfiguration Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, KubeControllersConfiguration, Kubernetes, Networking, Controller, DevOps

Description: Learn how to create and configure the Calico KubeControllersConfiguration resource to control the behavior of calico-kube-controllers.

---

## Introduction

The KubeControllersConfiguration resource in Calico defines how the calico-kube-controllers deployment operates. This controller watches Kubernetes resources and synchronizes them with the Calico datastore. It manages node controller operations, policy synchronization, workload endpoint garbage collection, and service account token management.

A properly configured KubeControllersConfiguration ensures that your Calico deployment stays in sync with Kubernetes state changes. Without it, stale resources can accumulate, node references may become orphaned, and policy updates may not propagate correctly.

This guide walks through creating the KubeControllersConfiguration resource with all available controller settings and explains when each controller should be enabled.

## Prerequisites

- A Kubernetes cluster with Calico installed
- `kubectl` and `calicoctl` configured with cluster admin access
- The calico-kube-controllers deployment running in your cluster
- Understanding of which Calico features your cluster uses

## Understanding the Controllers

The KubeControllersConfiguration manages several independent controllers:

- **node**: Syncs Kubernetes node resources with Calico node objects and performs garbage collection
- **policy**: Syncs Kubernetes NetworkPolicy resources with Calico policy objects
- **workloadendpoint**: Garbage collects orphaned workload endpoints
- **serviceaccount**: Syncs service account labels for use in Calico policy selectors
- **namespace**: Syncs namespace labels for use in Calico policy selectors

## Creating a Basic Configuration

The resource is a singleton named `default`. Create the baseline configuration:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  healthChecks: Enabled
  controllers:
    node:
      reconcilerPeriod: 5m
      syncLabels: Enabled
      hostEndpoint:
        autoCreate: Disabled
    policy:
      reconcilerPeriod: 5m
    workloadEndpoint:
      reconcilerPeriod: 5m
```

Apply the configuration:

```bash
calicoctl apply -f kubecontrollers-config.yaml
```

## Enabling All Controllers

For clusters that use Calico policy with namespace and service account selectors:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  healthChecks: Enabled
  controllers:
    node:
      reconcilerPeriod: 5m
      syncLabels: Enabled
      hostEndpoint:
        autoCreate: Enabled
      leakGracePeriod: 15m
    policy:
      reconcilerPeriod: 5m
    workloadEndpoint:
      reconcilerPeriod: 5m
    serviceAccount:
      reconcilerPeriod: 5m
    namespace:
      reconcilerPeriod: 5m
```

## Configuring Automatic Host Endpoints

Enable automatic host endpoint creation for host-level network policy enforcement:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  healthChecks: Enabled
  controllers:
    node:
      reconcilerPeriod: 5m
      syncLabels: Enabled
      hostEndpoint:
        autoCreate: Enabled
    policy:
      reconcilerPeriod: 5m
    workloadEndpoint:
      reconcilerPeriod: 5m
```

When `autoCreate` is Enabled, Calico automatically creates a HostEndpoint for each interface on every node. This enables GlobalNetworkPolicy rules to apply to node traffic.

## Setting Log Severity Levels

Adjust logging for debugging or production:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  healthChecks: Enabled
  controllers:
    node:
      reconcilerPeriod: 5m
      syncLabels: Enabled
      hostEndpoint:
        autoCreate: Disabled
    policy:
      reconcilerPeriod: 5m
    workloadEndpoint:
      reconcilerPeriod: 5m
```

Valid log levels are: Debug, Info, Warning, Error, and Fatal. Use Debug only for temporary troubleshooting as it produces significant output.

## Tuning Reconciler Periods

For large clusters, increase reconciler periods to reduce API server load:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  healthChecks: Enabled
  controllers:
    node:
      reconcilerPeriod: 10m
      syncLabels: Enabled
      hostEndpoint:
        autoCreate: Disabled
      leakGracePeriod: 30m
    policy:
      reconcilerPeriod: 10m
    workloadEndpoint:
      reconcilerPeriod: 10m
    serviceAccount:
      reconcilerPeriod: 10m
    namespace:
      reconcilerPeriod: 10m
```

Longer periods mean slower convergence but less API server pressure.

## Verification

After creating the configuration, verify it is active:

```bash
# Check the configuration
calicoctl get kubecontrollersconfiguration default -o yaml

# Verify the controller pod is running and healthy
kubectl get pods -n calico-system -l k8s-app=calico-kube-controllers

# Check controller logs for errors
kubectl logs -n calico-system -l k8s-app=calico-kube-controllers --tail=30

# If auto host endpoints are enabled, verify they were created
calicoctl get hostendpoints -o wide
```

## Troubleshooting

- If the controller pod crashes after applying the config, check logs with `kubectl logs -n calico-system -l k8s-app=calico-kube-controllers --previous`
- The resource name must be `default`. Any other name is ignored by the controller
- If host endpoints are not being created, verify the node controller has `hostEndpoint.autoCreate: Enabled` and that calico-node is reporting node status
- For high API server load, increase reconcilerPeriod values and check the controller pod resource requests
- If policies are not syncing, ensure the policy controller is enabled and check for RBAC issues in the controller logs

## Conclusion

The KubeControllersConfiguration resource gives you fine-grained control over how Calico synchronizes with Kubernetes. Start with a basic configuration that enables the node, policy, and workloadEndpoint controllers, then add namespace and serviceAccount controllers as needed for policy selectors. Tune reconciler periods based on your cluster size and acceptable convergence time.
