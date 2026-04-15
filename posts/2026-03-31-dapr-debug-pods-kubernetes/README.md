# How to Debug Dapr Pods on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Debugging, Troubleshooting, Observability

Description: Debug Dapr-enabled pods on Kubernetes using log inspection, exec commands, port-forwarding to the sidecar API, and the Dapr dashboard.

---

## Debugging Strategy for Dapr Pods

Dapr pods have two containers: your application and the daprd sidecar. Issues can originate in either layer. A systematic approach covers sidecar health, component state, API call tracing, and network connectivity.

## Enable Debug Logging

Add the debug log level annotation before deploying:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/app-port: "8080"
  dapr.io/log-level: "debug"
  dapr.io/log-as-json: "true"
  dapr.io/enable-api-logging: "true"
```

Or patch a running deployment:

```bash
kubectl patch deployment myapp --type=json \
  -p='[{"op":"add","path":"/spec/template/metadata/annotations/dapr.io~1log-level","value":"debug"}]'
kubectl rollout restart deployment/myapp
```

## Inspect Sidecar Logs

```bash
# Sidecar logs
kubectl logs -l app=myapp -c daprd --tail=100

# Follow logs in real time
kubectl logs -f deployment/myapp -c daprd

# Filter for errors and warnings
kubectl logs -l app=myapp -c daprd | grep -E "ERR|WARN|error|fail"

# API call log (with enable-api-logging annotation)
kubectl logs -l app=myapp -c daprd | grep "api_response"
```

## Port-Forward to the Sidecar API

```bash
# Get the pod name
POD=$(kubectl get pod -l app=myapp -o jsonpath='{.items[0].metadata.name}')

# Forward sidecar HTTP port
kubectl port-forward $POD 3500:3500

# Now query the sidecar directly
# Check health
curl http://localhost:3500/v1.0/healthz

# List registered components
curl http://localhost:3500/v1.0/metadata | jq '.components'

# List registered subscriptions
curl http://localhost:3500/v1.0/metadata | jq '.subscriptions'

# Invoke a state store get
curl http://localhost:3500/v1.0/state/statestore/my-key
```

## Check Network Connectivity from the Application Container

The daprd sidecar uses a distroless base image with no shell or networking tools. Run diagnostics from the application container instead:

```bash
# Exec into the application container
kubectl exec -it $POD -c myapp -- /bin/sh

# Inside the container:
# Check if the sidecar HTTP port is reachable
# wget -O- http://localhost:3500/v1.0/healthz
# Verify DNS resolution for a Dapr control plane service
# nslookup dapr-sentry.dapr-system.svc.cluster.local
```

## Use the Dapr Dashboard

```bash
# Launch the Dapr dashboard
dapr dashboard -k -p 9999

# Open http://localhost:9999
# Navigate to Applications > myapp to see:
# - Active components
# - Active subscriptions
# - Actor runtime status
```

## Check Dapr Control Plane Logs

```bash
# Operator logs (component loading issues)
kubectl logs -n dapr-system -l app=dapr-operator --tail=50

# Sentry logs (mTLS certificate issues)
kubectl logs -n dapr-system -l app=dapr-sentry --tail=50
```

## Summary

Debugging Dapr pods involves enabling debug logging and API logging via annotations, using `kubectl port-forward` to query the sidecar metadata API, and leveraging the Dapr dashboard for a visual overview of registered components and subscriptions. Always check both the application container and daprd container logs to pinpoint the failure layer.
