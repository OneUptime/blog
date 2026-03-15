# How to Document Calico Typha Configuration for Operators

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Configuration, Documentation, Scalability

Description: A practical guide to extracting, organizing, and maintaining documentation of Calico Typha configuration for operational teams.

---

## Introduction

Typha acts as a caching proxy between the Calico datastore and Felix agents. Its configuration controls connection limits, health checking behavior, logging, and resource usage. When misconfigured, Typha can become a bottleneck that affects policy propagation across the entire cluster.

For platform engineering teams, maintaining clear documentation of Typha's configuration ensures that capacity planning decisions are understood, incident responders can quickly identify misconfigurations, and new team members can onboard without guesswork.

This guide provides a structured approach to extracting Typha configuration from a live cluster and organizing it into maintainable documentation.

## Prerequisites

- Kubernetes cluster with Calico v3.25+ and Typha deployed
- `kubectl` access with cluster-admin privileges
- `calicoctl` CLI installed
- A documentation repository or wiki for storing the output

## Extracting Typha Configuration

Typha configuration comes from multiple sources. Extract each one:

### Deployment Specification

```bash
# Export the Typha deployment
kubectl get deployment -n calico-system calico-typha -o yaml > typha-deployment.yaml

# Extract key configuration from environment variables
kubectl get deployment -n calico-system calico-typha -o yaml | grep -A 2 "env:" | head -30
```

### Environment Variables

Typha reads most of its configuration from environment variables set on the deployment:

```bash
# List all Typha environment variables
kubectl set env deployment/calico-typha -n calico-system --list
```

Key environment variables to document:

```bash
# Connection settings
TYPHA_MAXCONNECTIONSLOWERLIMIT  # Minimum connections to accept
TYPHA_MAXCONNECTIONSUPPERLIMIT  # Maximum connections to accept
TYPHA_HEALTHENABLED             # Enable health endpoint
TYPHA_HEALTHPORT                # Health check port
TYPHA_LOGSEVERITYSCREEN         # Log verbosity level
TYPHA_PROMETHEUSMETRICSENABLED  # Enable Prometheus metrics
TYPHA_PROMETHEUSMETRICSPORT     # Metrics port
```

### Calico ConfigMap

```bash
# Check for Typha settings in the calico config
kubectl get configmap -n calico-system -o yaml | grep -i typha
```

## Organizing Configuration Documentation

Create a structured document covering these categories:

### Connection Management

```bash
# Check connection limits
kubectl get deployment -n calico-system calico-typha -o yaml | grep -i "connection"
```

Document the connection limits and how they relate to cluster size:

```markdown
## Typha Connection Configuration

| Parameter | Value | Default | Purpose |
|-----------|-------|---------|---------|
| TYPHA_MAXCONNECTIONSLOWERLIMIT | 300 | 100 | Min connections before load shedding |
| TYPHA_MAXCONNECTIONSUPPERLIMIT | 500 | 300 | Hard connection limit |

Current cluster: 150 nodes = 150 Felix connections
Headroom: 150 connections remaining before lower limit
```

### Health and Monitoring

```bash
# Verify health endpoint
kubectl exec -n calico-system $(kubectl get pod -n calico-system -l k8s-app=calico-typha -o name | head -1) -- wget -qO- http://localhost:9098/liveness

# Check Prometheus metrics
kubectl exec -n calico-system $(kubectl get pod -n calico-system -l k8s-app=calico-typha -o name | head -1) -- wget -qO- http://localhost:9093/metrics | head -20
```

### Logging Configuration

```bash
# Check current log level
kubectl get deployment -n calico-system calico-typha -o yaml | grep -i "logseverity"
```

Document log levels and how to change them during incidents:

```bash
# Temporarily increase log verbosity for debugging
kubectl set env deployment/calico-typha -n calico-system TYPHA_LOGSEVERITYSCREEN=Debug

# Restore normal logging after debugging
kubectl set env deployment/calico-typha -n calico-system TYPHA_LOGSEVERITYSCREEN=Info
```

## Documenting Resource Limits

Record the resource requests and limits for capacity planning:

```bash
# Extract resource configuration
kubectl get deployment -n calico-system calico-typha -o yaml | grep -A 8 "resources:"
```

Document the resource settings alongside observed usage:

```bash
# Check actual resource usage
kubectl top pods -n calico-system -l k8s-app=calico-typha
```

## Documenting TLS Configuration

If Typha uses TLS for Felix connections, document the certificate configuration:

```bash
# Check for TLS-related environment variables
kubectl get deployment -n calico-system calico-typha -o yaml | grep -i "tls\|cert\|key\|ca"

# Check for mounted secrets
kubectl get deployment -n calico-system calico-typha -o yaml | grep -A 5 "volumes"
```

## Tracking Configuration History

Establish a process for tracking changes:

```bash
# Snapshot current configuration
kubectl get deployment -n calico-system calico-typha -o yaml > "typha-config-$(date +%Y-%m-%d).yaml"

# Store in version control
git add "typha-config-$(date +%Y-%m-%d).yaml"
git commit -m "Typha configuration snapshot $(date +%Y-%m-%d)"
```

## Verification

Confirm your documentation is accurate by checking the live state:

```bash
# Verify Typha pods are running
kubectl get pods -n calico-system -l k8s-app=calico-typha -o wide

# Check Typha health
for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-typha -o name); do
  echo "=== $pod ==="
  kubectl exec -n calico-system $pod -- wget -qO- http://localhost:9098/readiness 2>/dev/null
  echo ""
done

# Verify documented values match live configuration
kubectl set env deployment/calico-typha -n calico-system --list
```

## Troubleshooting

**Typha rejecting connections**: If Felix agents cannot connect, check the connection upper limit. Increase `TYPHA_MAXCONNECTIONSUPPERLIMIT` or add more Typha replicas.

**Metrics endpoint not responding**: Verify that `TYPHA_PROMETHEUSMETRICSENABLED` is set to `true` and the metrics port is not blocked by network policies.

**Configuration changes not applied**: After changing environment variables on the deployment, Kubernetes will perform a rolling update of Typha pods. Monitor the rollout:

```bash
kubectl rollout status deployment/calico-typha -n calico-system
```

## Conclusion

Documenting Calico Typha configuration ensures that your team has a clear understanding of connection limits, health checking, logging, and resource allocation. By extracting configuration from the live cluster, organizing it into logical categories, and tracking changes over time, operators can maintain confidence in their networking infrastructure. Schedule regular reviews of this documentation, especially before cluster scaling events or Calico version upgrades.
