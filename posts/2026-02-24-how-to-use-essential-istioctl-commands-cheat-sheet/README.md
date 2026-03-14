# How to Use Essential istioctl Commands (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istioctl, Cheat Sheet, Kubernetes, Service Mesh, CLI

Description: A comprehensive cheat sheet of essential istioctl commands for managing, debugging, and monitoring your Istio service mesh.

---

The `istioctl` CLI is the primary tool for managing Istio. It goes well beyond what kubectl can do for your mesh because it understands Istio's configuration model and can query the Envoy proxies directly. This cheat sheet covers the commands you will actually use on a regular basis, organized by task.

## Installation and Setup

### Install Istio

```bash
# Install with default profile
istioctl install --set profile=default

# Install with demo profile (includes extras like Kiali, Grafana)
istioctl install --set profile=demo

# Install with custom configuration file
istioctl install -f my-config.yaml

# Install a specific revision (for canary upgrades)
istioctl install --revision 1-22

# Dry run to see what would be installed
istioctl install --set profile=default --dry-run
```

### Uninstall Istio

```bash
# Uninstall everything
istioctl uninstall --purge

# Uninstall a specific revision
istioctl uninstall --revision 1-22
```

### Version Information

```bash
# Show client and server versions
istioctl version

# Short version output
istioctl version --short

# JSON output
istioctl version -o json

# Client version only
istioctl version --remote=false
```

## Mesh Management

### Profiles

```bash
# List available profiles
istioctl profile list

# Dump a profile to see its configuration
istioctl profile dump default

# Diff two profiles
istioctl profile diff default demo
```

### Namespace Management

```bash
# Label namespace for sidecar injection
kubectl label namespace default istio-injection=enabled

# Label for a specific revision
kubectl label namespace default istio.io/rev=1-22

# Check injection labels
kubectl get namespace -L istio-injection -L istio.io/rev
```

## Proxy Configuration

### Proxy Status

```bash
# Show sync status of all proxies
istioctl proxy-status

# Short alias
istioctl ps
```

### Listeners

```bash
# Show all listeners for a workload
istioctl proxy-config listeners deploy/my-app -n default

# Filter by port
istioctl proxy-config listeners deploy/my-app -n default --port 8080

# JSON output for detailed view
istioctl proxy-config listeners deploy/my-app -n default -o json

# Short alias
istioctl pc l deploy/my-app -n default
```

### Routes

```bash
# Show all routes
istioctl proxy-config routes deploy/my-app -n default

# Filter by route name
istioctl proxy-config routes deploy/my-app -n default --name 80

# JSON output
istioctl proxy-config routes deploy/my-app -n default -o json

# Short alias
istioctl pc r deploy/my-app -n default
```

### Clusters

```bash
# Show all upstream clusters
istioctl proxy-config clusters deploy/my-app -n default

# Filter by FQDN
istioctl proxy-config clusters deploy/my-app -n default \
  --fqdn api-server.backend.svc.cluster.local

# JSON output
istioctl proxy-config clusters deploy/my-app -n default -o json

# Short alias
istioctl pc c deploy/my-app -n default
```

### Endpoints

```bash
# Show all endpoints
istioctl proxy-config endpoints deploy/my-app -n default

# Filter by cluster name
istioctl proxy-config endpoints deploy/my-app -n default \
  --cluster "outbound|8080||api-server.backend.svc.cluster.local"

# Show only healthy endpoints
istioctl proxy-config endpoints deploy/my-app -n default \
  --status healthy

# Short alias
istioctl pc ep deploy/my-app -n default
```

### Secrets

```bash
# Show certificates loaded in the proxy
istioctl proxy-config secret deploy/my-app -n default

# JSON output with full cert details
istioctl proxy-config secret deploy/my-app -n default -o json
```

### Bootstrap

```bash
# Show bootstrap configuration
istioctl proxy-config bootstrap deploy/my-app -n default -o json
```

### All Configuration

```bash
# Dump all proxy config
istioctl proxy-config all deploy/my-app -n default

# JSON dump of everything
istioctl proxy-config all deploy/my-app -n default -o json
```

## Debugging and Diagnostics

### Analyze Configuration

```bash
# Analyze all namespaces
istioctl analyze --all-namespaces

# Analyze specific namespace
istioctl analyze -n default

# Analyze specific files (without applying)
istioctl analyze my-virtualservice.yaml

# Suppress specific messages
istioctl analyze --all-namespaces --suppress "IST0102=Namespace *"
```

### Log Levels

```bash
# Set all proxy log levels to debug
istioctl proxy-config log deploy/my-app -n default --level debug

# Set specific component log levels
istioctl proxy-config log deploy/my-app -n default \
  --level rbac:debug,connection:info,router:debug

# Reset to default
istioctl proxy-config log deploy/my-app -n default --level warning
```

### Bug Reports

```bash
# Generate full bug report
istioctl bug-report

# Scoped to specific namespaces
istioctl bug-report --include default,backend

# With time range
istioctl bug-report --duration 30m

# Save to specific directory
istioctl bug-report --dir /tmp/reports
```

### Describe

```bash
# Describe configuration affecting a pod
istioctl x describe pod my-app-abc123.default

# Describe a service
istioctl x describe service my-app.default
```

## Security

### Authentication Check

```bash
# Check mTLS status for a workload
istioctl authn tls-check deploy/my-app.default

# Check mTLS for a specific destination
istioctl authn tls-check deploy/my-app.default api-server.backend.svc.cluster.local
```

### Authorization Check

```bash
# Check authorization policies for a workload
istioctl x authz check deploy/my-app.default
```

## Traffic Management

### Inject Sidecar Manually

```bash
# Inject sidecar into a deployment YAML
istioctl kube-inject -f deployment.yaml | kubectl apply -f -

# Inject from stdin
kubectl get deployment my-app -n default -o yaml | istioctl kube-inject -f - | kubectl apply -f -
```

## Dashboard Access

```bash
# Open Kiali dashboard
istioctl dashboard kiali

# Open Grafana
istioctl dashboard grafana

# Open Jaeger
istioctl dashboard jaeger

# Open Prometheus
istioctl dashboard prometheus

# Open Envoy admin for a specific pod
istioctl dashboard envoy deploy/my-app -n default

# Open istiod control plane dashboard
istioctl dashboard controlz deploy/istiod -n istio-system
```

## Upgrade

```bash
# Pre-check before upgrade
istioctl x precheck

# Check if an upgrade is available
istioctl version

# Canary upgrade with revisions
istioctl install --revision 1-23

# Verify the upgrade
istioctl verify-install
```

## Common Patterns

### Quick Health Check

```bash
istioctl version --short && \
istioctl ps | head -5 && \
istioctl analyze -A 2>&1 | head -10
```

### Find Pods Without Sidecars

```bash
istioctl analyze -A 2>&1 | grep IST0103
```

### Check All Proxy Versions

```bash
istioctl ps | awk 'NR>1 {print $NF}' | sort | uniq -c
```

### Get Envoy Stats for a Pod

```bash
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -E "^(http|upstream|downstream)"
```

### Force Configuration Push

```bash
# Restart istiod to trigger a full config push
kubectl rollout restart deployment istiod -n istio-system
```

## Useful Aliases

Add these to your shell profile for faster access:

```bash
alias ic='istioctl'
alias ips='istioctl proxy-status'
alias ipc='istioctl proxy-config'
alias ipcl='istioctl proxy-config listeners'
alias ipcr='istioctl proxy-config routes'
alias ipcc='istioctl proxy-config clusters'
alias ipce='istioctl proxy-config endpoints'
alias ipcs='istioctl proxy-config secret'
alias ia='istioctl analyze --all-namespaces'
```

These aliases turn multi-word commands into quick shortcuts. For example, checking proxy listeners becomes just `ipcl deploy/my-app -n default`.

Keep this cheat sheet handy. These commands cover probably 90% of the istioctl operations you will need for day-to-day Istio management and troubleshooting.
