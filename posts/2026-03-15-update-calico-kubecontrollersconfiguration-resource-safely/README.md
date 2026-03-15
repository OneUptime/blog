# How to Update the Calico KubeControllersConfiguration Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, KubeControllersConfiguration, Kubernetes, Networking, Controllers, Migration, DevOps

Description: Safely update the Calico KubeControllersConfiguration resource to change controller behavior without disrupting cluster operations.

---

## Introduction

The KubeControllersConfiguration is a singleton resource that governs how calico-kube-controllers behaves across your entire cluster. Changes to this resource take effect when the controller pod detects the update, which typically happens within seconds. However, some changes have significant side effects that require careful planning.

Enabling automatic host endpoints creates new resources on every node. Changing reconciler periods affects how quickly the cluster converges after changes. Disabling controllers can leave stale resources behind. Each of these scenarios requires a different approach to ensure safe updates.

This guide covers safe procedures for modifying each section of the KubeControllersConfiguration, including impact analysis and rollback strategies.

## Prerequisites

- A Kubernetes cluster with Calico installed
- `kubectl` and `calicoctl` with cluster admin access
- An existing KubeControllersConfiguration resource named `default`
- Understanding of which controllers are currently active in your cluster

## Backing Up the Current Configuration

Always start by saving the current configuration:

```bash
calicoctl get kubecontrollersconfiguration default -o yaml > kcc-backup.yaml
```

Store this backup in version control or a secure location for rollback purposes.

## Enabling a New Controller Safely

When enabling a controller that was previously disabled, the controller starts processing existing resources. For the namespace controller:

```bash
# Check current state
calicoctl get kubecontrollersconfiguration default -o yaml
```

Apply the update with the new controller:

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
    namespace:
      reconcilerPeriod: 5m
```

```bash
calicoctl apply -f kcc-updated.yaml
```

Monitor the controller logs to verify the new controller starts cleanly:

```bash
kubectl logs -n calico-system -l k8s-app=calico-kube-controllers -f --tail=20
```

## Enabling Automatic Host Endpoints

This is a high-impact change that creates HostEndpoint resources for every node interface. Plan this carefully:

```bash
# Step 1: Verify current host endpoints
calicoctl get hostendpoints

# Step 2: Check that no GlobalNetworkPolicy inadvertently blocks node traffic
calicoctl get globalnetworkpolicies -o yaml

# Step 3: Enable auto-creation
calicoctl patch kubecontrollersconfiguration default -p \
  '{"spec": {"controllers": {"node": {"hostEndpoint": {"autoCreate": "Enabled"}}}}}'

# Step 4: Verify host endpoints are created
calicoctl get hostendpoints -o wide
```

If host endpoint creation triggers unexpected policy enforcement, disable it immediately:

```bash
calicoctl patch kubecontrollersconfiguration default -p \
  '{"spec": {"controllers": {"node": {"hostEndpoint": {"autoCreate": "Disabled"}}}}}'
```

Note that disabling autoCreate does not automatically delete the host endpoints that were created. Clean them up manually if needed:

```bash
calicoctl get hostendpoints -o name | xargs -I {} calicoctl delete {}
```

## Adjusting Reconciler Periods

Change reconciler periods to tune convergence speed vs API server load:

```bash
calicoctl patch kubecontrollersconfiguration default -p \
  '{"spec": {"controllers": {"node": {"reconcilerPeriod": "10m"}, "policy": {"reconcilerPeriod": "10m"}, "workloadEndpoint": {"reconcilerPeriod": "10m"}}}}'
```

This change is non-disruptive. The controller applies the new period on its next reconciliation cycle.

## Changing Log Severity

Temporarily increase logging for debugging:

```bash
# Enable debug logging
calicoctl patch kubecontrollersconfiguration default -p \
  '{"spec": {"logSeverityScreen": "Debug"}}'

# Collect logs
kubectl logs -n calico-system -l k8s-app=calico-kube-controllers --tail=200 > debug-logs.txt

# Restore normal logging
calicoctl patch kubecontrollersconfiguration default -p \
  '{"spec": {"logSeverityScreen": "Info"}}'
```

## Disabling a Controller

When disabling a controller, be aware that it stops reconciling and garbage collecting its managed resources:

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
```

Removing the workloadEndpoint controller means orphaned endpoints are no longer cleaned up. Only disable controllers if you have an alternative process for managing those resources.

## Disabling Health Checks

In rare cases you may need to disable health checks temporarily:

```bash
calicoctl patch kubecontrollersconfiguration default -p \
  '{"spec": {"healthChecks": "Disabled"}}'
```

This prevents liveness probe failures from restarting the controller during extended reconciliation operations. Re-enable after the operation completes.

## Verification

After any update, verify the controller is operating correctly:

```bash
# Check the updated configuration
calicoctl get kubecontrollersconfiguration default -o yaml

# Verify the controller pod is healthy
kubectl get pods -n calico-system -l k8s-app=calico-kube-controllers

# Check for errors in logs
kubectl logs -n calico-system -l k8s-app=calico-kube-controllers --tail=30 | grep -i error

# Verify sync is happening (look for reconciliation messages)
kubectl logs -n calico-system -l k8s-app=calico-kube-controllers --tail=50 | grep -i reconcil
```

## Troubleshooting

- If the controller pod enters CrashLoopBackOff after an update, restore from backup: `calicoctl apply -f kcc-backup.yaml`
- If enabling host endpoints blocks node traffic, immediately disable autoCreate and check GlobalNetworkPolicy rules for overly broad deny rules
- When reconciler period changes do not seem to take effect, restart the controller: `kubectl rollout restart deployment calico-kube-controllers -n calico-system`
- If health checks fail after enabling a new controller, the new controller may be overwhelming the API server. Increase the reconciler period or add resource limits
- Always verify the resource name is `default`. Creating a KubeControllersConfiguration with any other name has no effect

## Conclusion

Updating the KubeControllersConfiguration resource safely requires understanding the impact of each field change. Non-disruptive changes like log severity and reconciler periods can be applied at any time. High-impact changes like enabling automatic host endpoints should be tested in staging first and deployed with a clear rollback plan. Always back up the current configuration before making changes and monitor controller logs after every update.
