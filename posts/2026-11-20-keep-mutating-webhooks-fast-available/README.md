# Keep Mutating Webhooks Fast and Available During Disruptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Reliability, Performance

Description: Combine webhook replicas, deliberate placement, disruption budgets, rollout controls, and measured timeouts without mistaking configuration for availability.

A mutating webhook sits on the path of matching API writes. Slow responses delay admission; unavailable responses can reject requests when the failure policy is Fail. Reliability therefore means more than keeping one process running. The service needs usable capacity during maintenance, predictable request latency, and a recovery path when part of the cluster fails.

The examples below target **Kubernetes v1.35.0**. They assume an existing webhook Deployment with working TLS, readiness checks, service selection, and narrowly scoped admission rules. The Deployment snippets are changes to merge into that configuration, not a replacement deployment with an invented server image.

## Start with the requests you must keep serving

Measure admission traffic before choosing replica counts or timeouts. Capture request rate, handler latency, failures, concurrent requests, and resource usage during both ordinary traffic and deployment bursts. A fleet restart can create far more admission work than an average minute.

Keep the handler's work bounded. Repeated remote lookups, synchronous provisioning, or expensive whole-object processing can turn a small traffic increase into a queue. Additional replicas help only if the bottleneck is parallelizable and shared dependencies can handle the additional demand.

Also reduce unnecessary calls through resource rules and selectors. A webhook that does not need a request should not become a dependency of that request. Kubernetes describes these latency and scope considerations in its [webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/).

## Spread capacity deliberately

Three replicas provide a useful starting point for a webhook that should retain two healthy replicas during a planned disruption. They are not a universal sizing rule. Two remaining replicas must be able to handle the expected load, and they should not all depend on the same node.

Merge this into the existing Deployment's `spec`, retaining the container specification and all unrelated settings:

```yaml
replicas: 3
minReadySeconds: 10
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
template:
  metadata:
    labels:
      app.kubernetes.io/name: injector
  spec:
    topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app.kubernetes.io/name: injector
```

Replace the label with the existing Deployment and Service label contract. Do not change an immutable Deployment selector casually. The spread selector must match the Pod labels, and other Pods sharing that selector can affect the scheduling calculation.

`maxSkew: 1` limits imbalance across eligible hostname domains. It does not guarantee three distinct nodes regardless of cluster size. With too few eligible nodes or insufficient resources, your actual placement and available capacity may differ from the intended design. Check the [topology spread rules](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/) against node labels, affinity, taints, and capacity.

For a multi-zone cluster, evaluate a zone constraint too. Node spread alone does not provide zone separation. Conversely, a strict placement rule can leave replacement Pods pending when suitable capacity is unavailable. Choose that tradeoff explicitly rather than adding constraints without a failure exercise.

## Use rollout controls and a disruption budget for different jobs

The Deployment settings above allow one extra replica during a rolling update and request zero unavailable replicas from the rollout strategy. `minReadySeconds: 10` requires a new Pod to remain ready for that interval before it counts as available. These are [Deployment controller settings](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), not protection against every failure.

The extra replica needs scheduling capacity. A rollout can stall if the cluster cannot place it or it never becomes ready. Keep enough room for maintenance and inspect the cause of stalled rollouts instead of immediately weakening the availability settings.

For eviction-based voluntary disruptions, use a PodDisruptionBudget, or PDB:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: injector
  namespace: platform-system
spec:
  minAvailable: 2
  unhealthyPodEvictionPolicy: AlwaysAllow
  selector:
    matchLabels:
      app.kubernetes.io/name: injector
```

This example assumes the webhook Deployment lives in `platform-system`; replace it with your actual namespace. The selector must identify the intended replicas, and overlapping budgets need deliberate review.

With three healthy matching Pods and a current budget, this policy ordinarily permits one healthy Pod's voluntary eviction while retaining two. If only two are healthy, it does not permit another healthy eviction. `AlwaysAllow` lets unhealthy running Pods be evicted even when the healthy budget is not satisfied, helping a drain avoid being trapped behind an unhealthy Pod. See the [PDB configuration guide](https://kubernetes.io/docs/tasks/run-application/configure-pdb/).

A PDB does not stop a node crash. It also does not govern a Deployment controller's rolling update or every direct deletion. Involuntary disruptions count against available capacity but cannot be prevented by the budget. The [disruption documentation](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/) explains why a budget complements, rather than replaces, rollout and placement design.

## Make readiness mean useful service

Readiness should reflect whether the replica can serve admission requests correctly. An open TCP port alone may not mean that required configuration, certificates, or policy data have loaded. Keep the check lightweight, but connect it to the server's actual readiness state.

Do not blindly make liveness depend on every remote system. Restarting all replicas because a shared dependency is temporarily unavailable can make recovery harder. Readiness, liveness, and startup probes have [different responsibilities](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/).

Verify that a terminating server stops accepting new work appropriately and allows in-flight requests to finish within the termination period. That behavior depends on your server implementation and should be tested during a rollout. Replica count alone cannot compensate for abruptly closing every active connection.

Keep the webhook's own Pods outside any admission rule that could prevent their replacement. The recovery path should not require the unavailable service to approve its own repair.

## Set timeouts from a latency budget

In the existing webhook entry, set an explicit timeout based on measurements. For example:

```yaml
timeoutSeconds: 3
```

Three seconds is an illustrative limit, not a recommended value for every service. Kubernetes allows 1 through 30 seconds and defaults to 10. A timeout is handled according to the webhook's failure policy; see the [timeout documentation](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#timeouts).

The handler should finish well before the limit under expected load, leaving room for transport and scheduling delays. If it calls dependencies, give those calls bounded deadlines that leave time to construct a response. Avoid retries that can outlive the admission call.

A long timeout increases how long a bad dependency can hold requests. A very short one can reject healthy requests during normal variation. Compare latency distributions during bursts and partial capacity, not only the fastest request from a developer's laptop.

## Inspect the running system and rehearse one disruption

For the example names, these commands are read-only:

```bash
kubectl get deployment injector -n platform-system
kubectl get pods -n platform-system -l app.kubernetes.io/name=injector -o wide
kubectl get pdb injector -n platform-system -o yaml
kubectl get endpointslices -n platform-system \
  -l kubernetes.io/service-name=injector -o yaml
```

Use the documented [kubectl get options](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/). Inspect Pod placement, ready replicas, PDB status including allowed disruptions, and service endpoints together. A declared budget is not proof that its status is current or that the API server can reach a ready backend.

In staging, send representative matching admission requests while exercising one planned rollout or eviction through your established maintenance procedure. Confirm the expected mutation, acceptable latency, remaining ready capacity, and replacement scheduling. Then test an unexpected replica failure separately; a PDB and a crash are different mechanisms.

The YAML in this article was parsed and checked against Kubernetes v1.35.0 OpenAPI shapes using complete local fixtures where necessary. No scheduler, eviction, rollout, or load test was run. Treat the configuration as a reviewed starting point and use those operational exercises to establish what your webhook can actually withstand.
