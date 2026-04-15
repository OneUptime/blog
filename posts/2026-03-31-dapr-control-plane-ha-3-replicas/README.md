# How to Configure Dapr Control Plane HA with 3 Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, High Availability, Control Plane, Kubernetes, Replica

Description: Step-by-step guide to configuring Dapr's control plane with exactly 3 replicas per component for production-grade high availability on Kubernetes.

---

Running Dapr's control plane with 3 replicas per component is the recommended production configuration. Three replicas allow the Raft consensus algorithm used by the placement service to maintain quorum even when one replica fails (tolerating 1 failure out of 3).

## Setting Replica Counts with Helm

Use Helm values to specify exact replica counts per component:

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --set dapr_operator.replicaCount=3 \
  --set dapr_sentry.replicaCount=3 \
  --wait
```

When `global.ha.enabled=true` is set, the placement and scheduler services (both StatefulSets) automatically run with 3 replicas. The operator and sentry replica counts can be set explicitly as shown above.

## Custom Helm Values File

For reproducible deployments, create a values file:

```yaml
global:
  ha:
    enabled: true

dapr_operator:
  replicaCount: 3

dapr_sentry:
  replicaCount: 3
```

The placement and scheduler services do not accept a `replicaCount` value. They are StatefulSets whose replica count is automatically set to 3 when `global.ha.enabled` is `true`.

Apply with:

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  -f dapr-ha-values.yaml \
  --wait
```

## Verifying Replica Status

Check all control plane replicas are running:

```bash
kubectl get deployments -n dapr-system
```

For the placement and scheduler services (which use StatefulSets):

```bash
kubectl get statefulset -n dapr-system
```

Verify leader election is working by checking logs:

```bash
kubectl logs -n dapr-system -l app=dapr-operator --tail=20
```

Look for messages like `successfully acquired lease` in the operator logs.

## Resource Requests for 3 Replicas

Each additional replica consumes cluster resources. Configure appropriate requests and limits:

```yaml
dapr_operator:
  replicaCount: 3
  resources:
    requests:
      cpu: 100m
      memory: 200Mi
    limits:
      cpu: 500m
      memory: 500Mi
```

Scale these values based on the number of applications managed by the operator.

## Monitoring Replica Health

Create a simple check to alert if any control plane replica is not ready:

```bash
kubectl get pods -n dapr-system \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\n"}{end}' | \
  grep -v Running
```

An empty output means all replicas are healthy. Integrate this check into your monitoring pipeline or CI/CD health gates.

## Rolling Updates with 3 Replicas

During Dapr upgrades, Kubernetes performs a rolling update. With 3 replicas and a max unavailable of 1, at least 2 replicas remain available throughout the update:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 1
```

This default behavior ensures zero downtime upgrades when upgrading between Dapr minor versions.

## Summary

Configuring Dapr's control plane with 3 replicas per component provides fault tolerance against single-node failures while maintaining Raft quorum for the placement service. Use Helm values files for reproducible HA configurations and regularly verify replica health as part of your operational runbooks.
