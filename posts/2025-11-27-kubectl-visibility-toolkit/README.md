# How to Build a kubectl Visibility Toolkit for Fast Incident Response

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Observability, Troubleshooting, DevOps

Description: A curated list of `kubectl` commands, aliases, and plugins that surface cluster health in seconds so you can answer “what broke?” without dashboards.

---

Dashboards are great, but `kubectl` is always there. Build muscle memory with these commands and you can triage most incidents before Grafana even loads.

## 1. See Cluster Shape

Start with a bird's-eye view of your cluster. These commands show you how many nodes are available, their versions, and current resource consumption.

These three commands give you a quick snapshot of your cluster's infrastructure. Running them first helps you understand the overall health and capacity before diving into specific workloads.

```bash
# List all nodes with extra details (IPs, OS, kubelet version)
# The -o wide flag adds columns for internal IP, external IP, OS image, and kernel version
kubectl get nodes -o wide

# Show all namespaces to understand workload organization
# Namespaces help you identify which teams or environments exist in the cluster
kubectl get namespaces

# Display real-time CPU and memory usage per node (requires metrics-server)
# High usage on any node might indicate resource pressure or scheduling issues
kubectl top nodes
```

- `-o wide` shows kubelet versions, OS images, and internal IPs.
- `kubectl top` (metrics server) surfaces CPU/memory hotspots quickly.

## 2. Inventory Workloads

These commands help you quickly inventory all workloads across the cluster and zero in on problem Pods.

Use these commands to get a complete picture of what is running and what is failing. The field selector is particularly powerful for filtering to only problematic Pods during an incident.

```bash
# List all Deployments, DaemonSets, and StatefulSets across all namespaces
# The -A flag (short for --all-namespaces) shows resources cluster-wide
kubectl get deploy,ds,sts -A

# Find Pods that are NOT Running (Pending, Failed, Unknown, etc.)
# Field selectors filter at the API level, making this very efficient
kubectl get pods -A --field-selector=status.phase!=Running

# Get details on specific Pods using label selectors
# Labels let you slice by team, service, or any custom dimension
kubectl get pods -n prod -l app=payments-api -o wide
```

Use labels to slice by team or service. The field selector filters to failed/pending Pods only.

## 3. Describe Everything

The `describe` command is your go-to for understanding why something is misbehaving. It shows the full spec, current status, and recent events in one output.

The describe command combines three critical pieces of information: the resource specification, its current state, and recent events. This is often enough to identify image pull errors, probe failures, or scheduling issues.

```bash
# Show Pod details including events (image pulls, probe failures, etc.)
# Events at the bottom reveal what Kubernetes tried to do and what failed
kubectl describe pod <name> -n prod

# Show node conditions, capacity, and allocated resources
# Useful for identifying resource pressure or node-level issues
kubectl describe node <node>

# Show Ingress backend status, TLS secrets, and controller events
# Helps debug routing issues and certificate problems
kubectl describe ingress payments -n prod
```

`describe` combines spec + status + events, which is usually enough to pinpoint image pull errors, crash loops, or admission webhook issues.

## 4. Stream Logs and Events

Logs and events are your primary debugging tools. These commands help you tail application output and track cluster-level happenings.

Application logs and cluster events provide complementary views: logs show what your code is doing, while events show what Kubernetes is doing. Together they tell the complete story of an incident.

```bash
# Stream the last 100 lines of logs from the Deployment (follows all Pods)
# The -f flag enables follow mode, streaming new log lines as they appear
kubectl logs deploy/payments-api -n prod --tail=100 -f

# Get logs from the previous container instance (after a crash)
# Essential for debugging crash loops where the current container has no history
kubectl logs pod/foo -n prod --previous

# List cluster events sorted by time (newest at bottom)
# Pipe to tail to see only the most recent events during active incidents
kubectl get events -A --sort-by=.lastTimestamp | tail -n 20
```

Use `--previous` to grab the last crashed container. Sorting events by timestamp bubbles the latest failures to the bottom.

## 5. Exec and Port-Forward

Need to inspect a container from the inside or test connectivity? These commands give you direct access.

Sometimes you need to get inside a running container to debug environment variables, test network connectivity, or inspect files. These commands provide direct access without modifying your deployment.

```bash
# Open an interactive shell inside a running container
# -it combines -i (interactive) and -t (allocate TTY) for shell access
kubectl exec -it deploy/payments-api -n prod -- /bin/sh

# Create a tunnel from localhost:9000 to the Service port 80
# Useful for testing services without exposing them via Ingress
kubectl port-forward svc/payments-api 9000:80 -n prod
```

Combine exec with `env`, `cat /app/config`, or `nslookup` to confirm runtime state. Port-forward lets you reproduce user traffic locally.

## 6. Explain CRDs and APIs

When you encounter an unfamiliar resource type or field, these commands provide built-in documentation straight from the cluster.

These commands are invaluable when working with custom resources or exploring unfamiliar API fields. The documentation comes directly from the cluster, so it always matches your Kubernetes version.

```bash
# List all available resource types and their API groups
# Helpful for discovering CRDs installed by operators or add-ons
kubectl api-resources

# Show field documentation for any resource (--recursive shows all nested fields)
# Pipe to less for easier navigation of deeply nested resources
kubectl explain deployment.spec.strategy --recursive | less
```

When faced with unfamiliar CRDs, `kubectl explain <kind>` lists fields and documentation straight from the cluster.

## 7. Check Access and RBAC

Debugging permission issues? These commands test whether you (or a service account) can perform specific actions.

RBAC issues are notoriously difficult to debug. These commands let you test permissions explicitly, eliminating guesswork when service accounts fail to access resources.

```bash
# Check if your current credentials can delete pods in prod
# Returns "yes" or "no" - useful for verifying your own permissions
kubectl auth can-i delete pods --namespace=prod

# Impersonate a service account to test its permissions
# The --as flag lets you check what another identity can do
kubectl auth can-i get secrets --as=system:serviceaccount:prod:ci-bot -n prod
```

These commands tell you immediately whether credentials have the rights they need, no guesswork.

## 8. Use `kubectl get` Output Formats

Customize output format based on what you need: quick scans, full YAML for editing, or specific fields for scripts.

Different output formats serve different purposes: wide for quick visual scans, YAML for editing or GitOps, and JSONPath for extracting specific data into shell scripts or monitoring tools.

```bash
# Wide output adds node names, IPs, and other useful columns
# Good for seeing pod placement and IP addresses at a glance
kubectl get pods -o wide

# Full YAML for copying/editing or storing in Git
# Use this when you need to recreate or version control resources
kubectl get pods -o yaml

# Extract just the node names using JSONPath
# JSONPath is powerful for scripting and extracting specific values
kubectl get pods -o=jsonpath='{.items[*].spec.nodeName}'
```

- `-o yaml` is perfect for copying objects into Git.
- JSONPath extracts specific fields for shell scripts or quick comparisons.

## 9. Favorite Plugins

Install via `kubectl krew install <plugin>`:

- `view-utilization`: quick CPU/mem/res limits per namespace.
- `neat`: strip status noise from YAML before committing.
- `who-can`: list who can perform a verb on a resource.
- `df-pv`: show PersistentVolume usage.

Plugins work anywhere `kubectl` does, so they travel with you between clusters.

## 10. Wrap With Aliases/Scripts

Add to your shell profile for faster typing:

Shell aliases reduce the keystrokes needed for common commands. These three aliases cover the most frequent operations and can save significant time during incident response.

```bash
# Define short aliases for frequently used commands
alias k='kubectl'              # Shortest possible kubectl
alias kgp='kubectl get pods'   # Quick pod listing
alias ksys='kubectl get pods -n kube-system'  # Check system components
```

For reproducible incident response, create scripts that gather common diagnostics:

This script automates the first steps of incident investigation. Running it immediately shows unhealthy Pods and recent events, giving you a starting point for deeper investigation.

```bash
#!/usr/bin/env bash
# pod-health.sh - Quick diagnostic script for incident response

set -euo pipefail               # Exit on error, undefined vars, pipe failures
ns=${1:-prod}                   # Default to prod if no namespace given

echo "=== Pods not Running in $ns ==="
# Show any Pods not in Running state - these are your immediate concerns
kubectl get pods -n "$ns" --field-selector=status.phase!=Running

echo "=== Recent Events in $ns ==="
# Show the 10 most recent events - look for errors and warnings
kubectl get events -n "$ns" --sort-by=.lastTimestamp | tail -n 10
```

Run `./scripts/pod-health prod` during on-call to get a quick snapshot.

---

Master these `kubectl` patterns and you have a portable observability toolkit-perfect for SREs jumping between clusters, CI systems, and air-gapped environments.
