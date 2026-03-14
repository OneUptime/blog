# How to Use Whisker in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Observability

Description: Use Calico Whisker to investigate pod connectivity issues, identify which network policies are denying traffic, and understand traffic patterns across your Kubernetes cluster.

---

## Introduction

Whisker's primary value is in troubleshooting network policy issues. The denied traffic view shows exactly which source pod was trying to connect to which destination, which policy denied it, and when. This information typically takes 30+ minutes to gather manually through logs - Whisker surfaces it in seconds through a visual interface.

## Key Operations

```bash
# Verify Whisker is running
kubectl get pods -n calico-system | grep whisker

# Access Whisker UI
kubectl port-forward -n calico-system svc/whisker 8081:8081
# Open: http://localhost:8081

# Check Whisker logs for issues
kubectl logs -n calico-system -l app=whisker --tail=50

# Check flow log configuration (affects what Whisker shows)
kubectl get felixconfiguration default -o jsonpath='{.spec.flowLogsFlushInterval}'
```

## Architecture

```mermaid
flowchart LR
    A[Applications] -->|connections| B[Felix flow logs]
    B --> C[Whisker backend]
    C --> D[Whisker UI]
    D --> E[Allowed traffic view]
    D --> F[Denied traffic view]
    D --> G[Policy decision view]
```

## Common Whisker Queries

```plaintext
# In Whisker UI - common investigation patterns:

# Find all denied connections to a service:
# Filter: destination=<service-name>, action=Deny

# Find all traffic from a specific pod:
# Filter: source=<pod-name>

# Find recently started connections:
# Sort by: timestamp descending

# Find policy drop sources:
# Filter: action=Deny, group by: source namespace
```

## Conclusion

Whisker provides the fastest path to understanding Calico network policy behavior in a running cluster. The denied traffic view replaces hours of log analysis with seconds of UI interaction. Validate Whisker periodically by cross-checking its view against known application connection patterns - this ensures the observability pipeline is functioning correctly before you rely on it during an incident.
