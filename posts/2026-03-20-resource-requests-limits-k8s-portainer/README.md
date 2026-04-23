# How to Set Resource Requests and Limits for Kubernetes Apps in Portainer - K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Resource Management, Performance, DevOps

Description: Learn how to configure CPU and memory requests and limits for Kubernetes applications in Portainer to ensure proper scheduling and stability.

## Why Resource Requests and Limits Matter

- **Requests**: The scheduler uses these to find a node with enough free capacity. A pod is only placed on a node if it can satisfy all its requests.
- **Limits**: The kubelet enforces these at runtime. Exceeding CPU limits causes throttling; exceeding memory limits causes the container to be killed (OOMKilled).

## Setting Resources in Portainer

When deploying an application in Portainer:

1. Scroll to the **Resource reservations** section.
2. Set **CPU limit** and **Memory limit (MB)**.
3. Portainer applies these values per application instance as both Kubernetes `requests` and `limits`. If you need different request and limit values, deploy or edit a manifest using standard Kubernetes units such as `m` for millicores and `Mi`/`Gi` for memory.

## Understanding CPU Units

```text
1 CPU = 1000m (millicores)
0.5 CPU = 500m
0.1 CPU = 100m
```

## Example Configuration

```yaml
# Resource requests and limits in a Deployment spec

spec:
  template:
    spec:
      containers:
        - name: api
          image: my-api:latest
          resources:
            requests:
              # Minimum guaranteed resources for scheduling
              cpu: 100m       # 0.1 CPU core
              memory: 128Mi   # 128 mebibytes
            limits:
              # Hard cap - exceeding memory causes OOMKill
              cpu: 500m       # 0.5 CPU core
              memory: 512Mi   # 512 mebibytes
```

Resource Sizing Guidelines

| App Type | CPU Request | CPU Limit | Memory Request | Memory Limit |
|----------|------------|-----------|----------------|--------------|
| Small web app | 50m | 200m | 64Mi | 256Mi |
| API service | 100m | 500m | 128Mi | 512Mi |
| Database | 500m | 2000m | 512Mi | 2Gi |
| Worker service | 200m | 1000m | 256Mi | 1Gi |

## Monitoring Resource Usage

```bash
# View actual resource usage per pod
kubectl top pod --namespace production

# View usage per container within pods
kubectl top pod --namespace production --containers

# Check for OOMKills or evictions
kubectl get events --namespace production | grep -E "OOMKill|Evict"

# Describe a pod to see resource limits and recent events
kubectl describe pod <pod-name> --namespace production
```

## Setting a Namespace LimitRange (Enforce Defaults)

Ensure all pods in a namespace have resources set by defining defaults:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-resources
  namespace: production
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        cpu: 250m
        memory: 256Mi
      max:
        cpu: "2"
        memory: 4Gi
```

## Diagnosing OOMKilled Containers

```bash
# Find pods whose last container termination reason was OOMKilled
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] as $pod | ($pod.status.containerStatuses // [])[] | select(.lastState.terminated.reason == "OOMKilled") | "\($pod.metadata.namespace)/\($pod.metadata.name) \(.name)"'
```

## Conclusion

Setting proper resource requests and limits is one of the most impactful actions for cluster stability. Use Portainer's resource fields during deployment, then monitor actual usage with `kubectl top` to right-size your limits over time.
