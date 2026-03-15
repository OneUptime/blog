# How to Monitor Calicoctl Kubernetes API Datastore Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Kubernetes, Monitoring, Prometheus, Observability

Description: Monitor your calicoctl Kubernetes API datastore configuration to detect connectivity issues, configuration drift, and resource health.

---

## Introduction

When calicoctl relies on the Kubernetes API datastore, the health of that connection directly determines whether network policy operations succeed or fail. Monitoring this configuration helps detect problems before they impact cluster networking.

Effective monitoring covers three areas: API server connectivity from calicoctl, the state of Calico resources stored in the datastore, and audit logging for configuration changes. Together these provide visibility into the operational health of your Calico setup.

This guide covers practical monitoring strategies using standard Kubernetes and Prometheus tooling.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` binary installed (v3.25+)
- Prometheus and Grafana deployed (optional, for metrics)
- `kubectl` access to the cluster

## Checking Datastore Connectivity

Verify that calicoctl can reach the Kubernetes API datastore:

```bash
export DATASTORE_TYPE=kubernetes

calicoctl node status
calicoctl get nodes -o wide
```

Script a periodic connectivity check:

```bash
#!/bin/bash
LOGFILE="/var/log/calicoctl-health.log"

while true; do
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  if calicoctl get nodes > /dev/null 2>&1; then
    echo "${TIMESTAMP} OK: datastore reachable" >> "$LOGFILE"
  else
    echo "${TIMESTAMP} ERROR: datastore unreachable" >> "$LOGFILE"
  fi
  sleep 60
done
```

## Monitoring Calico Resource Counts

Track the number of key Calico resources to detect unexpected changes:

```bash
#!/bin/bash

echo "=== Calico Resource Summary ==="
echo "IP Pools:              $(calicoctl get ippools -o json | jq '.items | length')"
echo "Global Network Policies: $(calicoctl get globalnetworkpolicies -o json | jq '.items | length')"
echo "Network Policies:      $(calicoctl get networkpolicies --all-namespaces -o json | jq '.items | length')"
echo "Host Endpoints:        $(calicoctl get hostendpoints -o json | jq '.items | length')"
echo "BGP Peers:             $(calicoctl get bgppeers -o json | jq '.items | length')"
```

## Exposing Felix Metrics to Prometheus

Felix exposes metrics on port 9091 by default. Ensure the FelixConfiguration enables this:

```bash
calicoctl get felixconfiguration default -o yaml
```

Verify the `prometheusMetricsEnabled` field is set to `true`:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
```

Apply with:

```bash
calicoctl apply -f felix-config.yaml
```

Create a Prometheus ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-felix
  namespace: monitoring
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  endpoints:
    - port: http-metrics
      interval: 30s
```

## Key Metrics to Watch

Monitor these Felix and Typha metrics in Prometheus:

```
felix_cluster_num_policies
felix_cluster_num_profiles
felix_cluster_num_host_endpoints
felix_datastore_connection_failures_total
felix_ipset_errors_total
typha_connections_accepted_total
typha_connections_dropped_total
```

## Enabling Kubernetes Audit Logging

Track calicoctl changes through Kubernetes audit logs by adding a policy entry:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: RequestResponse
    resources:
      - group: "crd.projectcalico.org"
        resources: ["*"]
    verbs: ["create", "update", "patch", "delete"]
```

## Verification

Confirm monitoring is operational:

```bash
# Check Felix metrics endpoint
kubectl get pods -n calico-system -l k8s-app=calico-node -o wide
curl -s http://<calico-node-ip>:9091/metrics | head -20

# Verify Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets and check calico-felix
```

## Troubleshooting

- **Metrics endpoint not reachable**: Confirm `prometheusMetricsEnabled: true` in FelixConfiguration and that port 9091 is not blocked by a network policy.
- **ServiceMonitor not discovered**: Ensure the ServiceMonitor namespace matches your Prometheus operator configuration and labels match the calico-node pods.
- **Resource counts return errors**: Verify that `jq` is installed and calicoctl has proper RBAC permissions for all resource types.
- **Audit logs missing Calico events**: Confirm the audit policy is loaded by the API server and includes the `crd.projectcalico.org` group.

## Conclusion

Monitoring your calicoctl Kubernetes API datastore configuration provides early warning of connectivity failures, configuration drift, and unauthorized changes. Combining periodic health checks, Prometheus metrics, and audit logging gives comprehensive visibility into your Calico deployment.
