# How to Configure Dapr High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, High Availability, Kubernetes, Resilience, Production

Description: Learn how to configure Dapr for high availability on Kubernetes by running multiple replicas of control plane components and enabling HA mode.

---

High availability (HA) in Dapr ensures that your microservices infrastructure remains operational even when individual nodes or pods fail. By default, Dapr runs a single replica of each control plane component, which creates a single point of failure. Enabling HA mode deploys multiple replicas and uses leader election or peer-based coordination depending on the component.

## Enabling HA Mode During Installation

The simplest way to enable HA is at install time using the Dapr CLI:

```bash
dapr init -k --enable-ha=true
```

For Helm-based installations, set the `global.ha.enabled` flag:

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --wait
```

## Verifying HA Control Plane Pods

After enabling HA, verify that each control plane component has 3 replicas:

```bash
kubectl get pods -n dapr-system
```

Expected output shows 3 replicas each for `dapr-operator`, `dapr-placement-server`, `dapr-sentry`, and `dapr-scheduler`.

## Configuring Pod Disruption Budgets

To prevent all replicas from being evicted simultaneously during rolling updates, define a PodDisruptionBudget:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dapr-operator-pdb
  namespace: dapr-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: dapr-operator
```

Apply this for each control plane component to maintain quorum during node maintenance.

## Spreading Replicas Across Nodes

Use pod anti-affinity rules to ensure replicas land on different nodes:

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - dapr-operator
        topologyKey: kubernetes.io/hostname
```

Inject this affinity spec via Helm values or patch the deployment after installation.

## Application-Level HA

Your application sidecars also benefit from HA patterns. Configure retry and circuit-breaker policies in a `Resiliency` resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: app-resiliency
spec:
  policies:
    retries:
      defaultRetryPolicy:
        policy: exponential
        maxRetries: 3
        duration: 1s
    circuitBreakers:
      defaultCircuitBreaker:
        maxRequests: 1
        interval: 30s
        timeout: 30s
        trip: consecutiveFailures >= 3
  targets:
    apps:
      checkout-service:
        retry: defaultRetryPolicy
        circuitBreaker: defaultCircuitBreaker
```

## Testing HA Behavior

Simulate node failure by cordoning and draining a node:

```bash
kubectl cordon node-1
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data
```

Watch Dapr pods reschedule and verify services continue operating. Uncordon the node when finished:

```bash
kubectl uncordon node-1
```

## Summary

Enabling Dapr HA mode deploys 3 replicas of each control plane component, using leader election (for the operator and placement service) or peer-based coordination (for the scheduler) to maintain consistency. Combining HA mode with pod disruption budgets, anti-affinity rules, and application-level resiliency policies provides a robust foundation for production Dapr deployments.
