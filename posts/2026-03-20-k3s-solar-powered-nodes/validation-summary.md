# Validation Summary: How to Set Up K3s Cluster with Solar-Powered Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Kubernetes Deployments, DaemonSets, ConfigMaps, and PriorityClasses
- Prometheus Operator (`PodMonitor`)
- Bash
- Solar-powered edge computing

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes ConfigMap update behavior: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- `kube-controller-manager` command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Prometheus Operator Getting Started: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- U.S. Department of Energy guidance on stand-alone renewable system sizing and batteries: https://www.energy.gov/energysaver/balance-system-equipment-required-renewable-energy-systems

## Issues Found

1. **Deployment manifest was invalid for `apps/v1`**: The `weather-sensor-collector` Deployment was missing `.spec.selector` and matching pod-template labels. Added both so the manifest matches Kubernetes `apps/v1` requirements.

2. **ConfigMap consumption method did not support live updates**: The post used `configMapKeyRef` as an environment variable for power state. Kubernetes does not update container environment variables when the source ConfigMap changes. Replaced this with a ConfigMap volume mount and a file path environment variable so workloads can read updated state from the mounted ConfigMap.

3. **DaemonSet referenced an undefined ServiceAccount**: The `power-monitor` DaemonSet specified `serviceAccountName: power-monitor-sa` without defining that ServiceAccount anywhere in the post. Removed the reference so the manifest is self-consistent.

4. **Prometheus Operator example could not work as written**: The post used a `ServiceMonitor` without a matching `Service`, and it omitted the namespace selection needed to scrape pods in `default` from a monitor in `monitoring`. Replaced the example with a `PodMonitor`, added a named metrics port to the DaemonSet, and included `namespaceSelector.matchNames` so the scrape target is correctly defined.

5. **PriorityClass explanation overstated behavior**: The original text implied that `PriorityClass` objects themselves suspend workloads on low battery. Kubernetes uses `PriorityClass` for scheduling and preemption priority, not automatic suspension. Updated the surrounding wording and descriptions to reflect scheduler priority rather than battery-state automation.

6. **K3s controller-manager explanation was inaccurate**: The original comment said the chosen controller-manager flags reduce polling frequency. Those flags actually reduce controller concurrency. Updated the comment to describe the effect correctly.

7. **Eviction explanation was inaccurate**: The original comment linked `eviction-hard` to avoiding high CPU load. That setting is about memory and disk pressure thresholds, so the comment was corrected.

8. **Namespace handling in `kubectl patch` commands was inconsistent**: The ConfigMap is explicitly created in the `default` namespace, but the patch commands omitted `-n default`. Added the namespace to make the commands consistent with the manifest and less dependent on the caller's current context.

9. **Night-time section title overstated what the script does**: The original heading referred to system sleep, but the script only scales workloads. Renamed the step and inline comment so they accurately describe night-hour workload reduction rather than system sleep.

10. **Solar sizing conclusion was too absolute**: The conclusion claimed a 200W panel and 100Ah battery could reliably power a node 24/7 in most geographic locations. Stand-alone solar sizing depends on geography, season, storage autonomy, and total load. Softened the statement to reflect those real deployment constraints.

## Review Notes
- `kubelet-arg` remains supported by K3s, but current K3s documentation recommends kubelet configuration files or drop-ins for newer releases when you need more advanced tuning.
- The `PodMonitor` example assumes Prometheus Operator CRDs are installed and that the Prometheus instance is configured to select that `PodMonitor`.
- The `solar-normal` `PriorityClass` uses `globalDefault: true`; Kubernetes allows only one global default `PriorityClass` in a cluster, so readers should avoid applying it unchanged if another global default already exists.
