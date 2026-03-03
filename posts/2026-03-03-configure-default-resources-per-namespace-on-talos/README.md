# How to Configure Default Resources per Namespace on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Resource Management, Namespace, LimitRange

Description: Learn how to configure default CPU, memory, and storage resources per namespace on Talos Linux to ensure predictable scheduling and prevent resource starvation.

---

When teams deploy applications to a Talos Linux cluster, they do not always specify resource requests and limits for their containers. This is a problem because the Kubernetes scheduler needs resource requests to make good placement decisions, and without limits, a single container can consume an entire node's resources. Configuring default resources per namespace ensures that every container has at least a baseline resource specification, even when the developer does not explicitly set one.

This post covers how to set up default resource configurations for namespaces on Talos Linux using LimitRange objects, why defaults matter for cluster stability, and practical strategies for choosing the right default values.

## Why Default Resources Matter

Without resource defaults, several things go wrong.

**Scheduling becomes unpredictable.** The scheduler uses resource requests to decide which node to place a pod on. If a container has no requests, the scheduler treats it as needing zero resources and places it anywhere. This can lead to node overload because the scheduler does not know the container actually needs 2GB of memory.

**Quality of Service is degraded.** Kubernetes assigns QoS classes based on resource specifications. Containers without any specifications get the BestEffort class, which means they are the first to be evicted when the node is under pressure.

**Resource quotas become unenforable.** If you have a resource quota on a namespace, Kubernetes requires every container to specify requests and limits when compute quotas are set. Without defaults, pods without resource specs will be rejected, causing confusion for developers.

## Setting Up Default Resources with LimitRange

The LimitRange resource is how you configure defaults in Kubernetes. It applies to every container created in the namespace.

```yaml
# default-resources.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-resources
  namespace: team-backend
spec:
  limits:
    - type: Container
      # Default limits - applied when no limit is specified
      default:
        cpu: 500m
        memory: 512Mi
        ephemeral-storage: 1Gi
      # Default requests - applied when no request is specified
      defaultRequest:
        cpu: 100m
        memory: 128Mi
        ephemeral-storage: 256Mi
```

```bash
kubectl apply -f default-resources.yaml
```

After applying this, any container in the team-backend namespace that does not specify resource requests or limits will automatically get these default values.

## Testing Default Resources

Let us verify that defaults are applied correctly.

```bash
# Create a pod without any resource specifications
kubectl -n team-backend run test-defaults --image=nginx

# Check what resources were assigned
kubectl -n team-backend get pod test-defaults -o jsonpath='{.spec.containers[0].resources}' | jq .

# Expected output:
# {
#   "limits": {
#     "cpu": "500m",
#     "ephemeral-storage": "1Gi",
#     "memory": "512Mi"
#   },
#   "requests": {
#     "cpu": "100m",
#     "ephemeral-storage": "256Mi",
#     "memory": "128Mi"
#   }
# }

# Clean up
kubectl -n team-backend delete pod test-defaults
```

Now test with a pod that specifies some resources:

```bash
# Create a pod with only requests specified
kubectl -n team-backend run test-partial --image=nginx \
  --overrides='{"spec":{"containers":[{"name":"test-partial","image":"nginx","resources":{"requests":{"cpu":"200m","memory":"256Mi"}}}]}}'

# Check resources - limits should use defaults, requests should use specified values
kubectl -n team-backend get pod test-partial -o jsonpath='{.spec.containers[0].resources}' | jq .

# Expected: requests are 200m/256Mi (specified), limits are 500m/512Mi (defaults)

kubectl -n team-backend delete pod test-partial
```

## Choosing Default Values

The right default values depend on your workload patterns. Here are guidelines for different types of namespaces.

### Web Application Namespaces

Web applications typically need moderate CPU and memory.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: web-app-defaults
  namespace: web-services
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      # Most web containers should not need more than this
      max:
        cpu: "2"
        memory: 4Gi
      min:
        cpu: 50m
        memory: 64Mi
```

### Background Worker Namespaces

Workers processing jobs or queues often need more memory.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: worker-defaults
  namespace: workers
spec:
  limits:
    - type: Container
      default:
        cpu: "1"
        memory: 2Gi
      defaultRequest:
        cpu: 250m
        memory: 512Mi
      max:
        cpu: "4"
        memory: 16Gi
      min:
        cpu: 100m
        memory: 128Mi
```

### Data Processing Namespaces

Data processing workloads can be resource-intensive.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: data-processing-defaults
  namespace: data-jobs
spec:
  limits:
    - type: Container
      default:
        cpu: "2"
        memory: 4Gi
      defaultRequest:
        cpu: 500m
        memory: 1Gi
      max:
        cpu: "16"
        memory: 64Gi
      min:
        cpu: 100m
        memory: 256Mi
```

## Ephemeral Storage Defaults

Do not forget ephemeral storage. Without limits, a container can fill up the node's disk with logs or temporary files, causing the node to become unhealthy.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: storage-defaults
  namespace: team-backend
spec:
  limits:
    - type: Container
      default:
        ephemeral-storage: 2Gi
      defaultRequest:
        ephemeral-storage: 500Mi
      max:
        ephemeral-storage: 10Gi
      min:
        ephemeral-storage: 100Mi
```

On Talos Linux, ephemeral storage is particularly important because the OS partition is limited and container runtime storage is on the same filesystem. A container that writes too much data to its writable layer can cause problems for the node.

## Init Container Defaults

LimitRange defaults also apply to init containers. If your pods use init containers, make sure the defaults make sense for them too.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: init-container-defaults
  namespace: team-backend
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
    # Init containers often need different resources
    # They run briefly during pod startup
    - type: InitContainer
      default:
        cpu: 250m
        memory: 256Mi
      defaultRequest:
        cpu: 50m
        memory: 64Mi
```

Note that init containers run sequentially before the main containers. Their resource requests are not added to the main container requests but compared separately for scheduling purposes.

## Pod-Level Defaults

In addition to container-level defaults, you can set constraints at the pod level.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-defaults
  namespace: team-backend
spec:
  limits:
    # Container defaults
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
    # Pod-level maximum
    # Prevents a pod with many containers from using too much
    - type: Pod
      max:
        cpu: "8"
        memory: 16Gi
      min:
        cpu: 100m
        memory: 128Mi
```

## Relationship Between Defaults and Explicit Values

Understanding how defaults interact with explicitly specified values is important.

```text
Scenario 1: No resources specified
  -> Default requests and limits are applied

Scenario 2: Only requests specified
  -> Specified requests are used
  -> Default limits are applied
  -> If default limit is lower than specified request, the request value is used as the limit

Scenario 3: Only limits specified
  -> Default requests are applied
  -> Specified limits are used
  -> If default request is higher than specified limit, the limit value is used as the request

Scenario 4: Both requests and limits specified
  -> Specified values are used
  -> No defaults applied
```

## Monitoring Default Usage

Track how many pods are using default values versus specifying their own. This tells you whether teams are thinking about resources or relying on defaults.

```bash
# Find pods in a namespace using default CPU request (100m)
kubectl -n team-backend get pods -o json | \
  jq -r '.items[] |
    select(.spec.containers[].resources.requests.cpu == "100m") |
    .metadata.name'

# Count pods using defaults vs specifying their own
TOTAL=$(kubectl -n team-backend get pods --no-headers | wc -l)
DEFAULTS=$(kubectl -n team-backend get pods -o json | \
  jq '[.items[] | select(.spec.containers[].resources.requests.cpu == "100m")] | length')
echo "Total pods: $TOTAL, Using defaults: $DEFAULTS"
```

If a large percentage of pods use defaults, consider whether the defaults are appropriate or whether teams need to be reminded to specify their actual needs.

## Applying Defaults Across All Namespaces

Use a script to apply consistent defaults across all team namespaces.

```bash
#!/bin/bash
# apply-defaults-all.sh
# Apply default resource configurations to all managed namespaces

NAMESPACES=$(kubectl get namespaces -l managed-by=platform-team \
  -o jsonpath='{.items[*].metadata.name}')

for ns in $NAMESPACES; do
  echo "Applying defaults to $ns..."
  kubectl -n "$ns" apply -f - <<EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: default-resources
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
        ephemeral-storage: 2Gi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
        ephemeral-storage: 256Mi
      max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 50m
        memory: 64Mi
    - type: Pod
      max:
        cpu: "8"
        memory: 16Gi
    - type: PersistentVolumeClaim
      max:
        storage: 100Gi
      min:
        storage: 1Gi
EOF
done

echo "Defaults applied to all namespaces."
```

## Updating Defaults

When you update a LimitRange, the change only affects new pods. Existing pods keep their current resource specifications, whether those were explicitly set or assigned by the previous defaults.

```bash
# Update the default memory limit
kubectl -n team-backend patch limitrange default-resources \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/limits/0/default/memory", "value": "1Gi"}]'

# To apply new defaults to existing deployments, restart them
kubectl -n team-backend rollout restart deployment --all
```

## Alerting on Missing LimitRanges

Set up an alert to catch namespaces that are missing their LimitRange.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: limitrange-alerts
  namespace: monitoring
spec:
  groups:
    - name: limitrange.rules
      rules:
        - alert: NamespaceMissingLimitRange
          expr: |
            count by (namespace) (kube_pod_info) > 0
            unless
            count by (namespace) (kube_limitrange)
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Namespace {{ $labels.namespace }} has pods but no LimitRange"
```

## Conclusion

Configuring default resources per namespace on Talos Linux is a fundamental best practice for cluster stability. LimitRange objects ensure that every container has resource specifications, even when developers forget to set them. This helps the scheduler make better placement decisions, gives containers a predictable QoS class, and works with resource quotas to enforce namespace-level limits. Choose defaults that match the typical workload pattern for each namespace, include ephemeral storage limits to protect node health, and monitor usage to identify namespaces that might need adjusted defaults. The small effort of setting up defaults pays off in a much more predictable and stable cluster.
