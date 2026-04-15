# How to Collect Dapr Diagnostic Logs for Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, Diagnostic, Support, Troubleshooting

Description: Learn how to collect comprehensive Dapr diagnostic logs, configurations, and runtime state to effectively troubleshoot issues or open support tickets.

---

When troubleshooting Dapr issues or filing a bug report, collecting the right diagnostic information upfront dramatically reduces resolution time. This guide covers everything you need to gather.

## Setting Log Level to Debug

Increase log verbosity before reproducing the issue. For Kubernetes:

```yaml
annotations:
  dapr.io/log-level: "debug"
  dapr.io/log-as-json: "true"
```

For local development:

```bash
dapr run --app-id myapp --log-level debug -- python app.py
```

## Collecting Sidecar Logs

Capture logs from all Dapr containers in a pod:

```bash
# Application container logs
kubectl logs <pod-name> -c <app-container> -n <namespace> > app.log

# Dapr sidecar logs
kubectl logs <pod-name> -c daprd -n <namespace> > daprd.log

# If the pod has restarted, get previous logs
kubectl logs <pod-name> -c daprd -n <namespace> --previous > daprd-previous.log
```

## Collecting Control Plane Logs

```bash
kubectl logs -l app=dapr-operator -n dapr-system > operator.log
kubectl logs -l app=dapr-sentry -n dapr-system > sentry.log
kubectl logs -l app=dapr-placement -n dapr-system > placement.log
kubectl logs -l app=dapr-sidecar-injector -n dapr-system > injector.log
kubectl logs -l app=dapr-scheduler-server -n dapr-system > scheduler.log 2>/dev/null || true
```

## Collecting Configuration State

```bash
# Dapr version
dapr version > version.txt

# All components
kubectl get components -A -o yaml > components.yaml

# All Dapr configurations
kubectl get configurations -A -o yaml > configurations.yaml

# All subscriptions
kubectl get subscriptions -A -o yaml > subscriptions.yaml

# Pod descriptions for affected pods
kubectl describe pod <pod-name> -n <namespace> > pod-describe.txt
```

## Collecting Kubernetes Events

```bash
kubectl get events -n <namespace> --sort-by='.lastTimestamp' > events.txt
kubectl get events -n dapr-system --sort-by='.lastTimestamp' > events-dapr-system.txt
```

## Runtime State Dump via HTTP

When the sidecar is running, capture its runtime state:

```bash
# Metadata
curl http://localhost:3500/v1.0/metadata | jq . > metadata.json

# Health check
curl -v http://localhost:3500/v1.0/healthz > healthz.txt 2>&1

# If profiling is enabled
curl http://localhost:7777/debug/pprof/goroutine?debug=1 > goroutines.txt
```

## Creating a Diagnostic Bundle

Automate the collection with a script:

```bash
#!/bin/bash
POD=$1
NS=${2:-default}
DIR="dapr-diag-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIR"

kubectl logs "$POD" -c daprd -n "$NS" > "$DIR/daprd.log"
kubectl describe pod "$POD" -n "$NS" > "$DIR/pod.txt"
kubectl get components -A -o yaml > "$DIR/components.yaml"
kubectl get events -n "$NS" > "$DIR/events.txt"
dapr version > "$DIR/version.txt"

tar czf "${DIR}.tar.gz" "$DIR"
echo "Diagnostic bundle: ${DIR}.tar.gz"
```

## Summary

Effective Dapr diagnostics require sidecar logs at debug level, control plane logs, component configurations, and Kubernetes events. Increase the log level before reproducing the issue, then collect all artifacts into a bundle. Include version information, component YAML files, and the output of `kubectl describe pod` to give support engineers the full picture.
