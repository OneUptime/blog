# How to Troubleshoot Whisker in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Observability

Description: Diagnose and resolve Whisker deployment issues including pods not starting, no flow data appearing in the UI, and Whisker not reflecting current policy decisions.

---

## Introduction

Whisker troubleshooting focuses on two failure modes: the Whisker backend pods not starting (usually RBAC or resource constraints) and flow data not appearing in the UI (usually a FelixConfiguration issue or flow log pipeline problem). Both are diagnosable through standard pod logs and Calico configuration inspection.

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

```
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

Whisker provides the fastest path to understanding Calico network policy behavior in a running cluster. The denied traffic view replaces hours of log analysis with seconds of UI interaction. Validate Whisker periodically by cross-checking its view against known application connection patterns — this ensures the observability pipeline is functioning correctly before you rely on it during an incident.
