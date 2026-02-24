# How to Quickly Restart Istio Sidecar Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Envoy, Kubernetes, Troubleshooting, Service Mesh

Description: Multiple methods to restart the Istio sidecar proxy in Kubernetes pods without causing unnecessary downtime or disruption.

---

Sometimes you need to restart the Istio sidecar proxy. Maybe the proxy is in a bad state, stuck with stale configuration, consuming too much memory, or you just want to force it to reload certificates. The trick is doing this without causing unnecessary downtime for your application.

Here are the different methods for restarting the Istio sidecar, from the safest to the most aggressive.

## Method 1: Rolling Restart the Deployment

The safest and most common approach is to do a rolling restart of the entire deployment. This recreates all pods, which means fresh sidecar proxies:

```bash
kubectl rollout restart deployment my-app -n default
```

This performs a zero-downtime rolling update. Kubernetes creates new pods with new sidecars before terminating the old ones. Your service stays available throughout the process.

Watch the rollout progress:

```bash
kubectl rollout status deployment my-app -n default
```

The downside is that this restarts your application containers too, not just the sidecar. If your application has a long startup time or expensive initialization, this might not be ideal.

## Method 2: Send SIGHUP to the Pilot Agent

Inside the sidecar container, the pilot-agent process manages the Envoy proxy. You can send it a SIGHUP signal to trigger a hot restart:

```bash
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  kill -HUP 1
```

This tells the pilot-agent to restart Envoy gracefully. The old Envoy process continues handling existing connections while the new one starts up. Once the new process is ready, existing connections drain to it.

This is less disruptive than restarting the entire pod because your application container keeps running.

Verify the sidecar restarted by checking its uptime:

```bash
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/server_info | python3 -c "import sys,json; print(json.load(sys.stdin)['uptime_current_epoch'])"
```

The uptime should be low (near zero) if the proxy just restarted.

## Method 3: Use the Envoy Admin API for Hot Restart

You can trigger a graceful drain and restart through the Envoy admin API:

```bash
# Start draining existing connections
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s -X POST localhost:15000/drain_listeners

# Check the drain status
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/stats | grep drain
```

Note that this drains listeners but does not fully restart the proxy. It is useful when you want to stop accepting new connections on the current process.

## Method 4: Delete the Pod

If you need to restart just one specific pod (not the whole deployment), delete it and let Kubernetes recreate it:

```bash
kubectl delete pod my-app-abc123 -n default
```

Kubernetes will create a new pod with a fresh sidecar based on your deployment spec. This is more disruptive than a rolling restart for that particular pod, but it is fast and simple.

If you have multiple replicas, deleting one pod at a time keeps the service available.

## Method 5: Restart Specific Pods by Label

To restart sidecars across multiple pods matching a label:

```bash
kubectl delete pods -n default -l app=my-app
```

Be careful with this if you have many replicas. Deleting all pods at once can cause a brief service outage. Kubernetes will recreate them, but there might be a gap.

For a safer approach, delete pods one at a time with a pause:

```bash
for pod in $(kubectl get pods -n default -l app=my-app -o name); do
  echo "Restarting $pod"
  kubectl delete $pod -n default
  sleep 10  # Wait for the new pod to be ready
done
```

## Method 6: Restart All Sidecars in a Namespace

If you need to refresh all sidecars in a namespace (for example, after an Istio upgrade), restart all deployments:

```bash
kubectl rollout restart deployment -n default
```

This restarts every deployment in the namespace, which means every pod gets a new sidecar.

For statefulsets:

```bash
kubectl rollout restart statefulset -n default
```

And for daemonsets:

```bash
kubectl rollout restart daemonset -n default
```

## When to Restart the Sidecar

Here are common situations where restarting the sidecar helps:

### After an Istio Upgrade

When you upgrade Istio, the control plane gets new versions but existing sidecars keep running the old version until they are restarted:

```bash
# Check for version mismatches
istioctl proxy-status | awk 'NR>1 {print $1, $NF}'
```

Any pod showing the old Istio version needs its sidecar restarted.

### When Configuration Is Stale

If `istioctl proxy-status` shows `STALE` for any xDS type:

```bash
istioctl proxy-status | grep STALE
```

A restart usually resolves stale configuration. But first check if istiod is healthy because the stale state might be a symptom of a control plane issue.

### When the Sidecar Is Using Too Much Memory

Check sidecar memory usage:

```bash
kubectl top pod my-app-abc123 -n default --containers
```

If the `istio-proxy` container is using significantly more memory than expected, a restart might help. But also investigate why it is using so much memory (too many endpoints, debug logging enabled, etc.).

### After Certificate Issues

If mTLS is failing due to expired or invalid certificates, restarting the sidecar forces it to request new certificates from the control plane:

```bash
# Check certificate validity
istioctl proxy-config secret deploy/my-app -n default
```

If the certificate shows as invalid or expired, restart the sidecar.

## Verifying the Restart Was Successful

After restarting, verify everything is working:

```bash
# Check pod status
kubectl get pod -n default -l app=my-app

# Verify proxy is synced
istioctl proxy-status | grep my-app

# Check proxy version
kubectl get pod my-app-abc123 -n default \
  -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].image}'

# Verify mTLS certificates are fresh
istioctl proxy-config secret deploy/my-app -n default

# Test connectivity
kubectl exec deploy/my-app -n default -- \
  curl -s http://other-service:8080/health
```

## Avoiding Unnecessary Restarts

Not every problem requires a sidecar restart. Some things can be fixed without restarting:

- **Log level changes**: Use `istioctl proxy-config log` to change log levels dynamically
- **Stats resets**: Use `curl -X POST localhost:15000/reset_counters` inside the proxy container
- **Configuration refresh**: Usually happens automatically when istiod pushes updates

## Automation Script

Here is a script for safely restarting sidecars across a deployment:

```bash
#!/bin/bash
DEPLOY=${1:?Usage: restart-sidecar.sh <deployment> <namespace>}
NS=${2:-default}

echo "Current sidecar version:"
kubectl get pods -n $NS -l app=$DEPLOY \
  -o jsonpath='{.items[0].spec.containers[?(@.name=="istio-proxy")].image}'
echo ""

echo "Starting rolling restart of $DEPLOY in $NS..."
kubectl rollout restart deployment $DEPLOY -n $NS

echo "Watching rollout..."
kubectl rollout status deployment $DEPLOY -n $NS

echo ""
echo "New sidecar version:"
kubectl get pods -n $NS -l app=$DEPLOY \
  -o jsonpath='{.items[0].spec.containers[?(@.name=="istio-proxy")].image}'
echo ""

echo "Proxy sync status:"
istioctl proxy-status | grep $DEPLOY
```

Run it with `./restart-sidecar.sh my-app default`. This gives you a clean, verified restart process that confirms the new sidecar is running and synced with the control plane.
