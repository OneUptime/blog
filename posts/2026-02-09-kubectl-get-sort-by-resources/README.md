# How to Use kubectl get --sort-by to Sort Resources by Age, Restarts, or Custom Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Resource Management

Description: Learn how to sort kubectl output by age, restart counts, resource usage, and custom fields using JSONPath expressions to quickly identify problem resources and trends.

---

Default kubectl get output shows resources in arbitrary order. Sorting reveals patterns like oldest pods, most-restarted containers, or highest resource consumers. The `--sort-by` flag uses JSONPath expressions to order output by any field.

## Basic Sorting Syntax

Sort by specifying a JSONPath expression:

```bash
# Sort pods by creation timestamp (age)
kubectl get pods --sort-by=.metadata.creationTimestamp

# Sort nodes by name
kubectl get nodes --sort-by=.metadata.name

# Sort services by namespace
kubectl get services --all-namespaces --sort-by=.metadata.namespace
```

The JSONPath points to the field used for sorting.

## Sorting Pods by Age

Find oldest or newest pods:

```bash
# Oldest pods first
kubectl get pods --sort-by=.metadata.creationTimestamp

# Newest first (requires reverse sort, use tac or tail)
kubectl get pods --sort-by=.metadata.creationTimestamp | tac

# Oldest pod in cluster
kubectl get pods --all-namespaces --sort-by=.metadata.creationTimestamp | head -2

# Newest pods across all namespaces
kubectl get pods --all-namespaces --sort-by=.metadata.creationTimestamp | tail -10
```

This identifies long-running pods that might need updates or cleanup.

## Sorting by Restart Count

Identify pods with frequent restarts:

```bash
# Sort by container restart count
kubectl get pods --sort-by=.status.containerStatuses[0].restartCount

# Show pods with most restarts
kubectl get pods --sort-by=.status.containerStatuses[0].restartCount | tail -10

# Across all namespaces
kubectl get pods --all-namespaces --sort-by=.status.containerStatuses[0].restartCount

# With custom columns to show restart count
kubectl get pods --sort-by=.status.containerStatuses[0].restartCount \
  -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount,STATUS:.status.phase
```

High restart counts indicate stability issues.

## Sorting Nodes by CPU Capacity

Order nodes by resource capacity:

```bash
# Sort nodes by CPU capacity
kubectl get nodes --sort-by=.status.capacity.cpu

# Sort by memory capacity
kubectl get nodes --sort-by=.status.capacity.memory

# Sort by pod capacity
kubectl get nodes --sort-by=.status.capacity.pods

# Show with wide output
kubectl get nodes --sort-by=.status.capacity.cpu -o wide
```

This reveals infrastructure sizing differences.

## Sorting Deployments by Replicas

Find largest deployments:

```bash
# Sort by desired replicas
kubectl get deployments --sort-by=.spec.replicas

# Sort by ready replicas
kubectl get deployments --sort-by=.status.readyReplicas

# Sort by available replicas
kubectl get deployments --sort-by=.status.availableReplicas

# Show deployments with most replicas
kubectl get deployments --sort-by=.spec.replicas | tail -10
```

This identifies which deployments consume the most resources.

## Sorting by Name

Alphabetical ordering:

```bash
# Sort pods alphabetically
kubectl get pods --sort-by=.metadata.name

# Sort services alphabetically
kubectl get services --sort-by=.metadata.name

# Sort across all resources
kubectl get all --sort-by=.metadata.name
```

Alphabetical sorting helps locate specific resources quickly.

## Sorting by Namespace

Organize output by namespace:

```bash
# Sort by namespace
kubectl get pods --all-namespaces --sort-by=.metadata.namespace

# Combine with grep to find namespace boundaries
kubectl get pods --all-namespaces --sort-by=.metadata.namespace | grep -E "NAMESPACE|^production"

# Count resources per namespace
kubectl get pods --all-namespaces --sort-by=.metadata.namespace | awk '{print $1}' | uniq -c
```

This groups resources by namespace for easier review.

## Sorting by Status Phase

Group resources by their state:

```bash
# Sort pods by phase (Running, Pending, Failed, etc.)
kubectl get pods --sort-by=.status.phase

# Show all failed pods together
kubectl get pods --all-namespaces --sort-by=.status.phase | grep Failed

# Group by phase with custom columns
kubectl get pods --sort-by=.status.phase \
  -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,NODE:.spec.nodeName
```

This quickly identifies resources in problematic states.

## Sorting Services by Type

Order services by their type:

```bash
# Sort services by type (ClusterIP, NodePort, LoadBalancer)
kubectl get services --all-namespaces --sort-by=.spec.type

# Find all LoadBalancer services
kubectl get services --all-namespaces --sort-by=.spec.type | grep LoadBalancer

# Count service types
kubectl get services --all-namespaces --sort-by=.spec.type \
  -o custom-columns=TYPE:.spec.type,NAME:.metadata.name | grep -v TYPE | cut -d' ' -f1 | sort | uniq -c
```

This reveals service type distribution.

## Sorting PVCs by Storage Size

Find largest storage claims:

```bash
# Sort by requested storage
kubectl get pvc --all-namespaces --sort-by=.spec.resources.requests.storage

# Show largest PVCs
kubectl get pvc --all-namespaces --sort-by=.spec.resources.requests.storage | tail -10

# With custom columns
kubectl get pvc --all-namespaces --sort-by=.spec.resources.requests.storage \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,SIZE:.spec.resources.requests.storage,STATUS:.status.phase
```

This identifies storage consumption patterns.

## Sorting by Node Name

Group pods by their node assignment:

```bash
# Sort pods by node name
kubectl get pods --all-namespaces --sort-by=.spec.nodeName

# Count pods per node
kubectl get pods --all-namespaces --sort-by=.spec.nodeName \
  -o custom-columns=NODE:.spec.nodeName,POD:.metadata.name | grep -v NODE | awk '{print $1}' | uniq -c

# Show pods on specific node
kubectl get pods --all-namespaces --sort-by=.spec.nodeName | grep worker-1
```

This reveals node utilization and pod distribution.

## Sorting by Priority Class

Order by pod priority:

```bash
# Sort by priority class name
kubectl get pods --all-namespaces --sort-by=.spec.priorityClassName

# Sort by numeric priority value
kubectl get pods --all-namespaces --sort-by=.spec.priority

# Show high-priority pods
kubectl get pods --all-namespaces --sort-by=.spec.priority | tail -20
```

This identifies which pods have scheduling priority.

## Combining Sort with Label Filtering

Filter then sort:

```bash
# Get labeled pods sorted by age
kubectl get pods -l app=nginx --sort-by=.metadata.creationTimestamp

# Get production pods sorted by restarts
kubectl get pods -n production --sort-by=.status.containerStatuses[0].restartCount

# Get backend services sorted by name
kubectl get services -l tier=backend --sort-by=.metadata.name
```

Filtering before sorting focuses on relevant subsets.

## Sorting Events by Timestamp

Find recent cluster events:

```bash
# Sort events by last occurrence
kubectl get events --all-namespaces --sort-by=.lastTimestamp

# Recent events
kubectl get events --all-namespaces --sort-by=.lastTimestamp | tail -20

# Events for specific object
kubectl get events --field-selector involvedObject.name=webapp --sort-by=.lastTimestamp

# Warning events sorted by time
kubectl get events --all-namespaces --sort-by=.lastTimestamp | grep Warning
```

This creates timeline views of cluster activity.

## Reverse Sorting

Kubernetes doesn't have native reverse sort, but use shell tools:

```bash
# Newest pods first (reverse chronological)
kubectl get pods --sort-by=.metadata.creationTimestamp | tac

# Pods with fewest restarts first
kubectl get pods --sort-by=.status.containerStatuses[0].restartCount | tac

# Smallest deployments first
kubectl get deployments --sort-by=.spec.replicas | tac

# Alternative: use tail and head
kubectl get pods --sort-by=.metadata.creationTimestamp | tail -r  # BSD systems
```

Reversing output changes sort order without re-sorting.

## Sorting with Wide Output

Combine sort with detailed output:

```bash
# Sort pods by age with wide output
kubectl get pods --sort-by=.metadata.creationTimestamp -o wide

# Sort nodes by CPU with wide output
kubectl get nodes --sort-by=.status.capacity.cpu -o wide

# Sort deployments by replicas with wide output
kubectl get deployments --sort-by=.spec.replicas -o wide
```

Wide output adds columns like IP addresses and node names.

## Creating Sorted Reports

Generate sorted resource reports:

```bash
#!/bin/bash
# resource-report.sh

echo "=== Pods by Age ==="
kubectl get pods --all-namespaces --sort-by=.metadata.creationTimestamp

echo -e "\n=== Pods by Restart Count ==="
kubectl get pods --all-namespaces --sort-by=.status.containerStatuses[0].restartCount | tail -20

echo -e "\n=== Nodes by CPU Capacity ==="
kubectl get nodes --sort-by=.status.capacity.cpu

echo -e "\n=== Deployments by Replica Count ==="
kubectl get deployments --all-namespaces --sort-by=.spec.replicas | tail -15

echo -e "\n=== Recent Events ==="
kubectl get events --all-namespaces --sort-by=.lastTimestamp | tail -30
```

Automated reports reveal cluster patterns.

## Sorting in Monitoring Scripts

Use sorting in monitoring automation:

```bash
#!/bin/bash
# monitor-restarts.sh

THRESHOLD=5

# Get pods sorted by restart count
PODS=$(kubectl get pods --all-namespaces --sort-by=.status.containerStatuses[0].restartCount -o json)

# Check for high restart counts
echo "$PODS" | jq -r '.items[] | select(.status.containerStatuses[0].restartCount > '$THRESHOLD') | "\(.metadata.namespace)/\(.metadata.name): \(.status.containerStatuses[0].restartCount) restarts"'
```

This alerts on pods exceeding restart thresholds.

## Sorting Custom Resources

Sort CRDs by their fields:

```bash
# Sort custom resources by creation time
kubectl get applications.argoproj.io --all-namespaces --sort-by=.metadata.creationTimestamp

# Sort by CRD-specific fields
kubectl get certificates.cert-manager.io --all-namespaces --sort-by=.status.notAfter

# Sort ingresses by host
kubectl get ingress --all-namespaces --sort-by=.spec.rules[0].host
```

Sorting works with any resource type including CRDs.

## Performance Considerations

Sorting large result sets can be slow:

```bash
# Slow on large clusters (sorts thousands of pods)
kubectl get pods --all-namespaces --sort-by=.metadata.creationTimestamp

# Faster: limit scope with namespace
kubectl get pods -n production --sort-by=.metadata.creationTimestamp

# Faster: use label selectors
kubectl get pods -l app=nginx --sort-by=.metadata.creationTimestamp
```

Narrow scope before sorting to improve performance.

## Sorting Multiple Fields

JSONPath doesn't support multi-field sorts. Use external tools:

```bash
# Sort by namespace then name
kubectl get pods --all-namespaces --sort-by=.metadata.namespace | sort -k2

# Sort by status then restarts
kubectl get pods -o custom-columns=STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount,NAME:.metadata.name | sort -k1,2

# Complex multi-field sorting with awk
kubectl get pods -o json | jq -r '.items | sort_by(.status.phase, .metadata.creationTimestamp) | .[] | "\(.metadata.name) \(.status.phase)"'
```

External tools enable complex sorting logic.

## Troubleshooting Sort Issues

When sorting produces unexpected results:

```bash
# Verify field exists
kubectl get pods -o json | jq '.items[0].metadata.creationTimestamp'

# Check field type (numeric vs string)
kubectl explain pods.status.containerStatuses.restartCount

# Test JSONPath expression
kubectl get pods -o jsonpath='{.items[*].status.containerStatuses[0].restartCount}'

# Handle missing fields gracefully
# Some pods might not have containerStatuses yet
kubectl get pods --sort-by=.status.containerStatuses[0].restartCount 2>&1 | grep -v "not found"
```

Fields must exist on all resources to sort correctly.

## Integration with Custom Columns

Combine sorting with custom output:

```bash
# Sort and display custom columns
kubectl get pods --sort-by=.status.containerStatuses[0].restartCount \
  -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount,AGE:.metadata.creationTimestamp

# Multiple custom columns with sorting
kubectl get nodes --sort-by=.status.capacity.memory \
  -o custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu,MEMORY:.status.capacity.memory,PODS:.status.capacity.pods
```

This creates fully customized sorted reports.

Sorting transforms kubectl output from random listings into organized insights. Sort by age to find outdated resources, by restarts to identify unstable pods, or by capacity to understand infrastructure. Combine sorting with custom columns and label selectors for powerful cluster analysis. For more output customization, see https://oneuptime.com/blog/post/kubectl-custom-columns-output-format/view.
