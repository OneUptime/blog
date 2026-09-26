# PodDisruptionBudgets and Deployment Rollouts: Protection and Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, PodDisruptionBudget, Deployment, High Availability

Description: Distinguish eviction protection from Deployment update strategy, explain why a rollout can exceed a PDB budget, and coordinate node maintenance with application releases.

---

A PodDisruptionBudget can report zero allowed disruptions while a Deployment continues replacing Pods. This is expected: the Deployment controller's rolling update is not gated by the eviction API that enforces the PDB.

Use a PDB for cooperating eviction clients, such as a normal node drain, and use the Deployment's update settings to control application replacement. Both policies affect availability, but they authorize different actions.

## Identify the operation being protected

Kubernetes [disruption documentation](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/) explicitly distinguishes application updates from eviction. Direct Pod deletion also bypasses the PDB. Hardware failure, node loss, and other involuntary disruptions cannot be prevented by a budget.

| Operation | Relevant protection |
| --- | --- |
| Normal eviction-based node drain | PDB checked by the eviction path |
| Deployment rolling update | Deployment `maxUnavailable`, `maxSurge`, and availability checks |
| Direct deletion of a Pod or Deployment | PDB does not block the deletion |
| Node crash or network partition | PDB cannot prevent the outage |

Calling an action “voluntary” does not establish that it uses eviction. Check the API path and the maintenance tool's documented behavior. The [API-initiated eviction guide](https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/) describes how an eviction request is admitted or rejected.

## Work through a concrete mismatch

Assume `api` has four desired replicas and a PDB selecting exactly those Pods:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api
  namespace: production
spec:
  minAvailable: 4
  selector:
    matchLabels:
      app: api
```

When all four selected Pods are healthy, there is normally no healthy Pod available for an additional voluntary eviction under that minimum. Now consider this fragment of the Deployment:

```yaml
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 0
      maxUnavailable: 1
```

The rollout can scale down an old replica before its replacement is available. The PDB does not veto that controller action, even though it can take healthy capacity below the PDB's minimum.

This example shows why a PDB is not a general uptime guarantee. It is also why setting `minAvailable` equal to the steady replica count can block node drains without delivering the rollout behavior the team intended.

## Configure the Deployment's availability policy

If the application requires all four replicas to remain available while replacing them, a common strategy is:

```yaml
spec:
  replicas: 4
  minReadySeconds: 20
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

This fragment still requires a full Deployment with working readiness probes and sufficient scheduling and quota headroom. A Ready Pod must remain ready for `minReadySeconds` before it counts as available for rollout progression. That interval does not delay Service traffic once the Pod is Ready.

[Kubernetes Deployment strategy](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment) defines these controls. They bound the controller's planned replacement behavior; they cannot stop an unrelated node failure or an application defect from reducing availability. Terminating Pods can also continue consuming resources beyond the ordinary surge population.

For a smaller service, calculate the policy at its actual replica count. A percentage `maxUnavailable` rounds down, while surge rounds up. Capacity sufficient for steady state may still be insufficient to admit the extra Pod.

## Account for interaction with node maintenance

Although the PDB does not block the rollout itself, Pods made unavailable by the rollout count against its budget. A drain can therefore stall while an application release is in progress. That is useful evidence that the system is already spending its availability margin.

Inspect the budget and rollout together:

```bash
kubectl -n production get pdb api -o json |
  jq '{generation:.metadata.generation,
       observedGeneration:.status.observedGeneration,
       currentHealthy:.status.currentHealthy,
       desiredHealthy:.status.desiredHealthy,
       expectedPods:.status.expectedPods,
       disruptionsAllowed:.status.disruptionsAllowed}'
kubectl -n production get deployment api -o json |
  jq '{desired:.spec.replicas, strategy:.spec.strategy,
       updated:.status.updatedReplicas,
       ready:.status.readyReplicas,
       available:.status.availableReplicas,
       conditions:.status.conditions}'
```

Check that status is current, the PDB selector matches the intended Pods, and readiness is reliable. A zero budget does not identify the root cause by itself. It can reflect a deliberately strict policy, already unhealthy replicas, replacement Pods still starting, or a mismatch between expected and observed health.

The [PDB configuration guide](https://kubernetes.io/docs/tasks/run-application/configure-pdb/) describes budget choices and unhealthy-Pod eviction policy. Review those settings against the application's quorum or serving capacity, rather than changing them solely to make a maintenance command finish.

## Test the two paths separately

In staging, exercise a Deployment update and a normal eviction-based drain as separate tests. Observe PDB status, ready and available replicas, pending Pods, and user-facing error rate. Then test the allowed overlap if your operating model permits releases during node maintenance.

Avoid using `kubectl delete pod` as a test of PDB enforcement: it tests a different API path. Likewise, a rollout that completes with no errors does not prove the drain policy is usable.

Set an explicit concurrency rule for application releases and node maintenance. The PDB can help a cooperative drain wait, while the Deployment strategy controls replacement. The application still needs enough replicas, feasible placement, capacity, and graceful shutdown to remain healthy through both operations.
