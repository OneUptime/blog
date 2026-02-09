# How to Use kubectl JSONPath Expressions to Extract Nested Resource Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, JSONPath

Description: Master kubectl JSONPath expressions to extract deeply nested fields from Kubernetes resources, filter results, and build powerful custom queries for cluster analysis.

---

JSONPath gives you surgical precision when querying Kubernetes resources. While `-o yaml` dumps everything and `-o wide` shows predefined columns, JSONPath lets you extract exactly the data you need from deeply nested structures.

## Why JSONPath Matters

Kubernetes resources contain nested data structures. Finding a container's image version, resource limits, or node IP addresses buried three levels deep becomes tedious with grep and awk. JSONPath expressions provide a cleaner, more reliable approach.

## Basic JSONPath Syntax

Start with simple field extraction. The root object is `$`, fields use dot notation, and arrays use bracket notation with indices:

```bash
# Get pod names
kubectl get pods -o jsonpath='{.items[*].metadata.name}'

# Get first pod's status phase
kubectl get pods -o jsonpath='{.items[0].status.phase}'

# Get namespace of a specific deployment
kubectl get deployment nginx -o jsonpath='{.metadata.namespace}'
```

The `{.items[*]}` pattern appears frequently. Most `kubectl get` commands return a list, even for single resources, so you access the items array first.

## Extracting Nested Container Data

Container specs live several levels deep. Extract image versions, resource requests, and environment variables with nested path expressions:

```bash
# Get all container images in a pod
kubectl get pod webapp -o jsonpath='{.spec.containers[*].image}'

# Get memory requests for all containers
kubectl get pod webapp -o jsonpath='{.spec.containers[*].resources.requests.memory}'

# Get environment variable names from first container
kubectl get pod webapp -o jsonpath='{.spec.containers[0].env[*].name}'

# Get image pull policy for init containers
kubectl get pod webapp -o jsonpath='{.spec.initContainers[*].imagePullPolicy}'
```

These expressions navigate through spec.containers arrays and extract specific fields without parsing YAML manually.

## Working with Node Information

Nodes contain valuable infrastructure data buried in status fields. Extract IP addresses, capacity, and conditions:

```bash
# Get internal IPs of all nodes
kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'

# Get CPU capacity for each node
kubectl get nodes -o jsonpath='{.items[*].status.capacity.cpu}'

# Get node names and their kernel versions
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Get allocatable memory across all nodes
kubectl get nodes -o jsonpath='{.items[*].status.allocatable.memory}'
```

The `?(@.type=="InternalIP")` syntax uses filter expressions to select specific array elements based on field values.

## Filter Expressions for Conditional Selection

Filter expressions use `?()` syntax to select array elements matching conditions. The `@` symbol represents the current item:

```bash
# Get pods in Running state
kubectl get pods -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}'

# Get services with type LoadBalancer
kubectl get services -o jsonpath='{.items[?(@.spec.type=="LoadBalancer")].metadata.name}'

# Get pods with restart count greater than zero
kubectl get pods -o jsonpath='{.items[?(@.status.containerStatuses[0].restartCount>0)].metadata.name}'

# Get nodes marked as schedulable
kubectl get nodes -o jsonpath='{.items[?(@.spec.unschedulable!=true)].metadata.name}'
```

Filters work with comparison operators: `==`, `!=`, `<`, `>`, `<=`, `>=`. Combine them with nested paths to build complex queries.

## Formatting Output with Range

The `{range}` construct loops through arrays and formats output with newlines and tabs:

```bash
# List pod names and their node assignments
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}'

# Show deployments with replica counts
kubectl get deployments -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.replicas}{"\n"}{end}'

# List services with their cluster IPs
kubectl get services -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.clusterIP}{"\n"}{end}'

# Show PVCs with their storage class and size
kubectl get pvc -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.storageClassName}{"\t"}{.spec.resources.requests.storage}{"\n"}{end}'
```

Use `\n` for newlines and `\t` for tabs. This creates readable tabular output without piping to column utilities.

## Combining Multiple Fields

Extract multiple fields from the same resource in a single query:

```bash
# Get pod name, status, and restart count
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}'

# Get node name, CPU, and memory capacity
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.capacity.cpu}{"\t"}{.status.capacity.memory}{"\n"}{end}'

# Get deployment name, image, and replicas
kubectl get deployments -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\t"}{.spec.replicas}{"\n"}{end}'
```

This approach reduces command executions and presents related data together.

## Advanced: Nested Ranges

Use nested ranges to iterate through multi-level arrays like containers within pods:

```bash
# List all pods and their container names
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .spec.containers[*]}{"\t"}{.name}{"\n"}{end}{end}'

# Show pods with container images
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .spec.containers[*]}{"\t"}{.name}: {.image}{"\n"}{end}{end}'
```

The outer range iterates pods, the inner range iterates containers within each pod. This creates hierarchical output.

## Handling Missing Fields

JSONPath expressions fail silently when fields don't exist. Test paths and provide defaults:

```bash
# Some pods might not have resource limits set
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].resources.limits.memory}{"\n"}{end}'

# This returns empty strings for pods without limits
# Use || to provide defaults in shell processing
```

For production scripts, validate that expected fields exist before relying on output.

## Practical Use Cases

Generate node inventory reports:

```bash
# Create CSV of node details
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name},{.status.nodeInfo.kubeletVersion},{.status.capacity.cpu},{.status.capacity.memory}{"\n"}{end}' > nodes.csv
```

Find resource bottlenecks:

```bash
# Find pods with high restart counts
kubectl get pods --all-namespaces -o jsonpath='{range .items[?(@.status.containerStatuses[0].restartCount>5)]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}'
```

Audit image versions:

```bash
# List all unique images in the cluster
kubectl get pods --all-namespaces -o jsonpath='{.items[*].spec.containers[*].image}' | tr ' ' '\n' | sort -u
```

## Debugging JSONPath Expressions

Test expressions incrementally. Start with simple paths and add complexity:

```bash
# Start broad
kubectl get pods -o jsonpath='{.items[*]}'

# Add metadata
kubectl get pods -o jsonpath='{.items[*].metadata}'

# Narrow to names
kubectl get pods -o jsonpath='{.items[*].metadata.name}'

# Add filtering
kubectl get pods -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}'
```

Use `kubectl get -o json | jq` to explore resource structure before writing JSONPath expressions.

## Integration with Monitoring

JSONPath queries integrate into monitoring scripts and automation:

```bash
#!/bin/bash
# Check if any pods are in CrashLoopBackOff state
CRASH_PODS=$(kubectl get pods --all-namespaces -o jsonpath='{.items[?(@.status.containerStatuses[0].state.waiting.reason=="CrashLoopBackOff")].metadata.name}')

if [ -n "$CRASH_PODS" ]; then
    echo "Alert: Pods in CrashLoopBackOff: $CRASH_PODS"
    # Send to monitoring system
fi
```

This enables custom cluster health checks beyond standard metrics.

## Comparison with jq

JSONPath works natively with kubectl, while jq requires JSON output and pipe processing. JSONPath runs faster for simple queries, but jq offers more powerful transformations. Choose based on complexity:

```bash
# JSONPath - simpler, faster
kubectl get pods -o jsonpath='{.items[*].metadata.name}'

# jq - more powerful
kubectl get pods -o json | jq -r '.items[] | select(.status.phase=="Running") | .metadata.name'
```

For complex filtering and transformation, jq wins. For quick field extraction, JSONPath suffices.

JSONPath expressions transform kubectl from a basic viewer into a precise query tool. Master the syntax and you'll extract exactly the data you need without parsing full resource dumps. Check out https://oneuptime.com/blog/post/kubectl-custom-columns-output-format/view for another approach to custom output formatting.
