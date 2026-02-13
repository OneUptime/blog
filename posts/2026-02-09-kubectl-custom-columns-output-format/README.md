# How to Create Custom kubectl Output Columns with custom-columns Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Formatting

Description: Learn how to create custom kubectl output columns to display exactly the resource fields you need in a clean, readable table format for better cluster visibility.

---

The default `kubectl get` output shows a fixed set of columns. When you need different fields or want to combine data from multiple parts of a resource, custom columns provide the solution. This feature builds table views with precisely the information you need.

## Understanding Custom Columns

Custom columns let you define your own table layout with column headers and JSONPath expressions. Instead of accepting default output or parsing JSON manually, you specify exactly which fields to display:

```bash
# Default pod output shows NAME, READY, STATUS, RESTARTS, AGE
kubectl get pods

# Custom columns show whatever you specify
kubectl get pods -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image,NODE:.spec.nodeName
```

The format follows `HEADER:JSONPATH,HEADER:JSONPATH`. Each column gets a header name and a JSONPath expression pointing to the desired field.

## Basic Column Definitions

Start with simple single-field columns:

```bash
# Show pod names and namespaces
kubectl get pods --all-namespaces -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name

# Show deployments with replica information
kubectl get deployments -o custom-columns=NAME:.metadata.name,DESIRED:.spec.replicas,CURRENT:.status.replicas,READY:.status.readyReplicas

# Show services with their types and IPs
kubectl get services -o custom-columns=NAME:.metadata.name,TYPE:.spec.type,CLUSTER-IP:.spec.clusterIP
```

Column headers appear in uppercase by convention but accept any characters. Keep them concise for readable output.

## Extracting Container Information

Container data lives nested inside pod specs. Pull out images, resource limits, and other container fields:

```bash
# Show pods with container images and pull policies
kubectl get pods -o custom-columns=POD:.metadata.name,IMAGE:.spec.containers[0].image,PULL-POLICY:.spec.containers[0].imagePullPolicy

# Display resource requests and limits
kubectl get pods -o custom-columns=NAME:.metadata.name,CPU-REQUEST:.spec.containers[0].resources.requests.cpu,CPU-LIMIT:.spec.containers[0].resources.limits.cpu,MEM-REQUEST:.spec.containers[0].resources.requests.memory,MEM-LIMIT:.spec.containers[0].resources.limits.memory

# Show container ports
kubectl get pods -o custom-columns=NAME:.metadata.name,CONTAINER:.spec.containers[0].name,PORT:.spec.containers[0].ports[0].containerPort
```

The `[0]` index selects the first container. For multi-container pods, you might need to list all containers or specify different indices.

## Node Resource Views

Create custom views of node capacity, allocatable resources, and conditions:

```bash
# Node capacity overview
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu,MEMORY:.status.capacity.memory,PODS:.status.capacity.pods

# Allocatable resources
kubectl get nodes -o custom-columns=NODE:.metadata.name,CPU-ALLOC:.status.allocatable.cpu,MEM-ALLOC:.status.allocatable.memory,STORAGE:.status.allocatable.ephemeral-storage

# Node system information
kubectl get nodes -o custom-columns=NAME:.metadata.name,OS:.status.nodeInfo.osImage,KERNEL:.status.nodeInfo.kernelVersion,KUBELET:.status.nodeInfo.kubeletVersion

# Node IP addresses
kubectl get nodes -o custom-columns=NAME:.metadata.name,INTERNAL-IP:.status.addresses[0].address,HOSTNAME:.status.addresses[1].address
```

These views help with capacity planning and node inventory management.

## Status and Condition Columns

Extract status information and ready conditions:

```bash
# Pod status details
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,REASON:.status.reason,MESSAGE:.status.message

# Container status
kubectl get pods -o custom-columns=NAME:.metadata.name,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount,STATE:.status.containerStatuses[0].state

# Deployment conditions
kubectl get deployments -o custom-columns=NAME:.metadata.name,AVAILABLE:.status.conditions[0].status,PROGRESSING:.status.conditions[1].status
```

Conditions arrays contain multiple items. Access specific conditions by index or use JSONPath filters to find conditions by type.

## Metadata and Labels

Display creation timestamps, labels, and annotations:

```bash
# Show creation times
kubectl get pods -o custom-columns=NAME:.metadata.name,CREATED:.metadata.creationTimestamp

# Display specific labels
kubectl get pods -o custom-columns=NAME:.metadata.name,APP:.metadata.labels.app,VERSION:.metadata.labels.version,TIER:.metadata.labels.tier

# Show annotations
kubectl get pods -o custom-columns=NAME:.metadata.name,DESCRIPTION:.metadata.annotations.description
```

Labels and annotations use the label or annotation key as the field name. Missing labels show as `<none>`.

## Multi-Container Pod Views

For pods running multiple containers, display all container names and images:

```bash
# List all container names (not just first)
kubectl get pods -o custom-columns=POD:.metadata.name,CONTAINERS:.spec.containers[*].name

# Show all container images
kubectl get pods -o custom-columns=POD:.metadata.name,IMAGES:.spec.containers[*].image

# Combined view with counts
kubectl get pods -o custom-columns=NAME:.metadata.name,CONTAINER-COUNT:.spec.containers,IMAGE-LIST:.spec.containers[*].image
```

The `[*]` wildcard selects all array elements. Output appears space-separated when multiple values exist.

## Storage and Volume Information

Create columns showing persistent volume claims and volume mounts:

```bash
# PVC details
kubectl get pvc -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,VOLUME:.spec.volumeName,CAPACITY:.status.capacity.storage,STORAGECLASS:.spec.storageClassName

# Pods with volume claims
kubectl get pods -o custom-columns=NAME:.metadata.name,VOLUMES:.spec.volumes[*].name,CLAIMS:.spec.volumes[*].persistentVolumeClaim.claimName

# Persistent volume information
kubectl get pv -o custom-columns=NAME:.metadata.name,CAPACITY:.spec.capacity.storage,ACCESS-MODES:.spec.accessModes,RECLAIM:.spec.persistentVolumeReclaimPolicy,STATUS:.status.phase
```

These views help track storage utilization and PVC bindings.

## Network and Service Columns

Display service endpoints, port mappings, and ingress information:

```bash
# Service port mappings
kubectl get services -o custom-columns=NAME:.metadata.name,TYPE:.spec.type,PORTS:.spec.ports[*].port,TARGET-PORTS:.spec.ports[*].targetPort

# Ingress rules
kubectl get ingress -o custom-columns=NAME:.metadata.name,HOSTS:.spec.rules[*].host,PATHS:.spec.rules[*].http.paths[*].path,BACKEND:.spec.rules[*].http.paths[*].backend.service.name

# Endpoints
kubectl get endpoints -o custom-columns=NAME:.metadata.name,ADDRESSES:.subsets[*].addresses[*].ip,PORTS:.subsets[*].ports[*].port
```

Network views reveal service connectivity and routing configurations.

## Saving Column Definitions

Long column definitions become unwieldy. Save them to files for reuse:

```bash
# Save column definition to file
cat > pod-columns.txt << 'EOF'
NAME:.metadata.name,
NAMESPACE:.metadata.namespace,
IMAGE:.spec.containers[0].image,
NODE:.spec.nodeName,
STATUS:.status.phase,
RESTARTS:.status.containerStatuses[0].restartCount,
AGE:.metadata.creationTimestamp
EOF

# Use the saved definition
kubectl get pods --all-namespaces -o custom-columns-file=pod-columns.txt
```

The `--custom-columns-file` flag reads column definitions from a file. Split long definitions across multiple lines for readability.

## Combining with Selectors

Combine custom columns with label selectors and field selectors:

```bash
# Show specific labeled pods with custom columns
kubectl get pods -l app=nginx -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image,NODE:.spec.nodeName

# Filter by field selector
kubectl get pods --field-selector status.phase=Running -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,STARTED:.status.startTime
```

This narrows results before formatting, reducing visual clutter.

## Monitoring and Reporting Use Cases

Build cluster reports with custom columns:

```bash
# Resource utilization report
kubectl get pods --all-namespaces -o custom-columns=NAMESPACE:.metadata.namespace,POD:.metadata.name,CPU-REQ:.spec.containers[0].resources.requests.cpu,MEM-REQ:.spec.containers[0].resources.requests.memory,NODE:.spec.nodeName > resource-report.txt

# Image inventory
kubectl get pods --all-namespaces -o custom-columns=NAMESPACE:.metadata.namespace,POD:.metadata.name,IMAGE:.spec.containers[*].image,PULL-POLICY:.spec.containers[*].imagePullPolicy > image-inventory.txt

# Node health report
kubectl get nodes -o custom-columns=NODE:.metadata.name,STATUS:.status.conditions[3].type,READY:.status.conditions[3].status,CPU:.status.capacity.cpu,MEMORY:.status.capacity.memory > node-health.txt
```

These reports feed into capacity planning, compliance audits, and inventory tracking.

## Troubleshooting Custom Columns

When columns show unexpected output:

```bash
# Check the actual resource structure
kubectl get pods POD_NAME -o json | jq .

# Test JSONPath expressions separately
kubectl get pods POD_NAME -o jsonpath='{.spec.containers[0].image}'

# Verify array indices
kubectl get pods POD_NAME -o jsonpath='{.spec.containers}'
```

JSONPath expressions in custom columns follow the same rules as standalone JSONPath output. Missing fields display as `<none>`.

## Column Width and Formatting

kubectl automatically adjusts column widths based on content. Headers and values determine spacing:

```bash
# Short headers with long values create narrow columns
kubectl get pods -o custom-columns=N:.metadata.name,IMG:.spec.containers[0].image

# Descriptive headers improve readability
kubectl get pods -o custom-columns=POD-NAME:.metadata.name,CONTAINER-IMAGE:.spec.containers[0].image
```

Balance header length with readability. Too-short headers create confusion, too-long headers waste space.

## Creating Kubectl Aliases

Combine custom columns with aliases for frequently used views:

```bash
# Add to .bashrc or .zshrc
alias kpods='kubectl get pods -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image,NODE:.spec.nodeName,STATUS:.status.phase'

alias knodes='kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[3].status,CPU:.status.capacity.cpu,MEMORY:.status.capacity.memory'

alias kdeploy='kubectl get deployments -o custom-columns=NAME:.metadata.name,REPLICAS:.spec.replicas,AVAILABLE:.status.availableReplicas,IMAGE:.spec.template.spec.containers[0].image'
```

These aliases turn complex commands into simple shortcuts. Learn more about kubectl aliases at https://oneuptime.com/blog/post/2026-02-09-kubectl-aliases-shell-functions/view.

## Custom Columns vs JSONPath

Custom columns build tables, JSONPath extracts raw values:

```bash
# Custom columns - tabular output
kubectl get pods -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image

# JSONPath - space-separated values
kubectl get pods -o jsonpath='{.items[*].metadata.name}{" "}{.items[*].spec.containers[0].image}'
```

Use custom columns for human-readable output and JSONPath for script processing. See https://oneuptime.com/blog/post/2026-02-09-kubectl-jsonpath-expressions-nested-fields/view for detailed JSONPath usage.

Custom columns transform kubectl output into exactly the format you need. Define your own views, save common definitions, and create readable reports without external tools. Master this feature and you'll spend less time parsing kubectl output and more time understanding your cluster state.
