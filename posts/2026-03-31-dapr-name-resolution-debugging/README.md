# How to Debug Name Resolution Issues in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Name Resolution, Debugging, Service Discovery, Troubleshooting

Description: A practical guide to diagnosing and fixing name resolution failures in Dapr, covering mDNS, Kubernetes DNS, Consul, and SQLite components.

---

## Common Name Resolution Errors

Name resolution failures in Dapr typically manifest as errors like:

- `failed to invoke target order-service after 3 retries`
- `connection refused: could not find address for app ID`
- `no healthy upstream`

These errors mean Dapr could not resolve the target app ID to a network address. The root cause depends on which name resolution component you are using.

## Step 1: Check the Dapr Metadata API

The metadata endpoint shows loaded components and registered services:

```bash
curl http://localhost:3500/v1.0/metadata | jq .
```

If your name resolution component is not listed under `components`, it failed to load. Check component YAML syntax and verify the file is in the correct components directory.

## Step 2: Enable Debug Logging

Enable debug-level logging on the Dapr sidecar:

```bash
dapr run --app-id myapp --log-level debug -- ./myapp
```

For Kubernetes:

```yaml
annotations:
  dapr.io/log-level: "debug"
```

Filter for name resolution log entries:

```bash
kubectl logs myapp-pod -c daprd | grep -i "name.*resol\|resolve\|discover"
```

## Debugging mDNS Issues

mDNS failures are often caused by multicast being blocked. Test multicast connectivity:

```bash
# Check if mDNS port is reachable
nc -zuv localhost 5353
```

Verify services are advertising via mDNS:

```bash
# macOS
dns-sd -B _dapr._tcp local.

# Linux
avahi-browse -rt _dapr._tcp
```

If `avahi-browse` shows no results, multicast is blocked. Switch to SQLite or Consul.

## Debugging Kubernetes DNS Issues

For Kubernetes DNS problems, verify the Dapr headless service exists:

```bash
kubectl get svc -n default | grep "\-dapr$"
```

Test DNS resolution from a debug pod:

```bash
kubectl run debug --image=busybox --restart=Never -it --rm -- \
  nslookup order-service-dapr.default.svc.cluster.local
```

If DNS resolves but invocation fails, check if the Dapr sidecar is listening:

```bash
kubectl exec myapp-pod -c daprd -- \
  wget -qO- http://localhost:3500/v1.0/healthz
```

## Debugging Consul Issues

Check if services are registered in Consul:

```bash
curl http://localhost:8500/v1/catalog/services | jq .
curl http://localhost:8500/v1/health/service/order-service | jq .
```

A service with failing health checks will not be returned as a healthy endpoint. Fix the health check endpoint or adjust the check configuration.

Check Consul logs:

```bash
consul monitor -log-level=debug
```

## Debugging SQLite Issues

Inspect the SQLite database directly using the path from your component's `connectionString` metadata field:

```bash
sqlite3 /path/to/your/nr.db \
  "SELECT appID, address, port, updateTime FROM hosts ORDER BY updateTime DESC;"
```

If entries are present but stale (old `updateTime`), the registering service may have crashed. Check that `updateInterval` is shorter than `cleanupInterval` to prevent self-deregistration:

```yaml
metadata:
  - name: updateInterval
    value: "5s"
  - name: cleanupInterval
    value: "30s"
```

Also verify the database file is accessible from all services:

```bash
ls -la /path/to/your/nr.db
```

## Using the Dapr CLI for Invocation Testing

Test direct invocation to isolate resolution from application logic:

```bash
dapr invoke --app-id order-service \
  --method health \
  --verb GET
```

## Summary

Debug name resolution issues by first checking the Dapr metadata API for component loading, then enabling debug logging and filtering for resolution log entries. For mDNS, verify multicast is enabled. For Kubernetes DNS, confirm the headless service exists and test with `nslookup`. For Consul, check health check status. For SQLite, inspect the database file for stale or missing entries.
