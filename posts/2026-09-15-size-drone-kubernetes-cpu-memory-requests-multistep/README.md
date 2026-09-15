# How to Set CPU and Memory Requests for Multi-Step Drone Kubernetes Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Kubernetes, Resource Management, CI/CD, Troubleshooting

Description: Size Drone Kubernetes pipeline requests with container count, per-step limits, and measured resource contention in mind.

In a Drone Kubernetes pipeline, the request configured at pipeline level is a budget the runner distributes across containers. It is not the request that each step receives. A growing pipeline can therefore give its busiest container a smaller CPU request even when the YAML's total request never changes.

Drone's [resource configuration](https://docs.drone.io/runner/kubernetes/configuration/resources/) distinguishes pipeline requests, per-container limits, and minimum request values. Check the generated pod to see their combined effect.

## Understand the three different numbers

Suppose a compiled pipeline has four containers and requests 2 CPUs and 2 GiB of memory. An approximately equal split gives each container 500 millicores and 512 MiB. If the pipeline grows to eight containers with the same total, each receives about half that amount.

The runner's [compiler implementation](https://github.com/drone-runners/drone-runner-kube/blob/master/engine/compiler/compiler.go) counts compiled steps when dividing resources, including the clone container when enabled. It also applies minimum requests and caps requests at a container's configured limit. Consequently, calculate using actual generated containers, not just the visible test-step count.

| Setting | Meaning |
| --- | --- |
| Pipeline request | Starting budget distributed across build containers |
| Container limit | Maximum resource setting for one container |
| Minimum request | Floor applied while distributing requests |

Kubernetes uses requests for scheduling and CPU contention decisions. CPU limits can throttle execution; memory limits can lead to an out-of-memory kill. Requests alone do not cap usage. These are Kubernetes [resource-management semantics](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/), separate from how Drone constructs the pod.

## Configure a pipeline and inspect its pod

For an existing Go module:

```yaml
kind: pipeline
type: kubernetes
name: go-checks

resources:
  requests:
    cpu: 2000
    memory: 2GiB

steps:
  - name: format
    image: golang:1.25
    commands:
      - test -z "$$(gofmt -l .)"
  - name: test
    image: golang:1.25
    commands:
      - go test ./...
    resources:
      limits:
        cpu: 2000
        memory: 1GiB
  - name: build
    image: golang:1.25
    commands:
      - go build ./...
```

Drone CPU values here are integer millicores: `2000` means two CPUs. Do not copy Kubernetes's `"2"` CPU value into a Drone field expecting millicores. Memory examples use the units supported by Drone's resource parser.

While the build exists, inspect requests and limits:

```sh
kubectl get pod BUILD_POD -n ci -o jsonpath='{range .spec.containers[*]}{.name}{"\t"}{.resources}{"\n"}{end}'
kubectl describe pod BUILD_POD -n ci
kubectl top pod BUILD_POD -n ci --containers
```

The metrics command requires a working metrics API. Capture time-series data for short spikes that a single sample misses. Check init containers and pod overhead too when comparing the effective pod to node capacity.

## Avoid compensating with an oversized minimum

Administrators can configure request floors:

```text
DRONE_RESOURCE_MIN_REQUEST_CPU=100
DRONE_RESOURCE_MIN_REQUEST_MEMORY=128Mi
```

These can prevent tiny allocations in large pipelines. But twelve containers with a 256 MiB floor would require 3 GiB before any other adjustments, even if the original pipeline budget was 2 GiB. Raising a floor can increase the generated aggregate request and cause scheduling or quota failures.

Runner policies take precedence over YAML requests. A developer increasing `resources.requests` may see no change if an administrator policy fixes the value. Step limits may also be capped by runner or policy limits. Inspect those settings before repeatedly changing the pipeline.

## Size from observed failure modes

For CPU-starved tests, compare runtime on an idle node and a contended node, then inspect CPU usage and throttling. Increase the pipeline request if the active container's share is too small, or adjust a restrictive CPU limit if throttling is the problem.

For memory failures, inspect container termination reasons and peak memory. A pod can schedule successfully and still lose a test process to its memory limit. Raising CPU requests does not address that failure.

For a pipeline with one very large step and many tiny steps, consider separating the large job into its own pipeline so it receives an appropriate request budget. Account for the extra clone and artifact-transfer cost. Sequential commands inside one existing step may be another practical option if separate containers add no useful isolation.

After any change, repeat a representative concurrent workload and compare completion time, pending duration, generated requests, and node pressure. A faster isolated build is useful only if the runner fleet can still schedule the expected number of builds together.
