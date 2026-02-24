# How to Collect Istio Bug Reports with istioctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, istioctl, Bug Reports, Troubleshooting, Kubernetes

Description: Learn how to use istioctl bug-report to collect comprehensive diagnostic information from your Istio mesh for troubleshooting and bug reports.

---

When you run into an Istio issue that you can't solve on your own, you'll probably need to file a bug report or ask for help on the Istio community forums. The `istioctl bug-report` command collects everything someone would need to diagnose the problem - logs, configurations, proxy states, resource definitions, and cluster information. It packages it all into a single archive that you can share.

Even if you're not filing a bug, the command is useful for creating a snapshot of your mesh state that you can analyze offline.

## Running a Basic Bug Report

```bash
istioctl bug-report
```

This collects data from the entire mesh and creates a compressed tar.gz file in the current directory:

```
Creating an Istio bug report...
Collecting cluster information...
Collecting Istio control plane information...
Collecting proxy information for pods in namespace: default
Collecting proxy information for pods in namespace: istio-system
...
Bug report captured successfully. Archive: bug-report.tar.gz
```

The file can be quite large depending on your mesh size. For a medium-sized mesh with a few hundred pods, expect 50-200MB.

## What Gets Collected

The bug report archive contains several directories of information:

### Cluster Information

```
cluster-info/
  nodes.yaml
  namespaces.yaml
  pods.yaml
  services.yaml
  endpoints.yaml
  events.yaml
```

General Kubernetes cluster state that provides context for the Istio-specific data.

### Istio Control Plane

```
istio-system/
  istiod-*/
    logs.txt
    config_dump.json
    proxy-status.json
  istio-ingressgateway-*/
    logs.txt
    config_dump.json
    stats.txt
```

Istiod logs, gateway logs, and control plane configuration. This is the most important data for control plane issues.

### Per-Pod Proxy Data

```
default/
  httpbin-abc123/
    istio-proxy-logs.txt
    config_dump.json
    stats.txt
    proxy-status.json
```

For each pod with a sidecar, the report collects proxy logs, full Envoy configuration dump, statistics, and sync status.

### Istio Resources

```
istio-resources/
  virtualservices.yaml
  destinationrules.yaml
  gateways.yaml
  serviceentries.yaml
  sidecars.yaml
  authorizationpolicies.yaml
  peerauthentications.yaml
  telemetry.yaml
  envoyfilters.yaml
```

All Istio custom resources across all namespaces.

## Scoping the Bug Report

Collecting data from the entire mesh takes time and creates huge archives. Scope it down to what's relevant.

### By Namespace

```bash
istioctl bug-report --include default,production
```

Only collects data from the `default` and `production` namespaces (plus `istio-system` which is always included).

### By Time Duration

```bash
istioctl bug-report --duration 30m
```

Only collects logs from the last 30 minutes. This keeps log volumes manageable and focuses on recent events.

### By Specific Pods

If you know which pods are affected:

```bash
istioctl bug-report --include "default/httpbin-.*,default/sleep-.*"
```

The include pattern uses regex, so you can match multiple pods.

### Excluding Namespaces

To skip namespaces with lots of pods that aren't relevant:

```bash
istioctl bug-report --exclude monitoring,logging
```

## Controlling the Output

### Output Directory

```bash
istioctl bug-report --dir /tmp/istio-debug
```

### Output Filename

```bash
istioctl bug-report --filename my-mesh-debug.tar.gz
```

### Full Secrets

By default, secrets are redacted in the output. If you need full certificate content for debugging mTLS:

```bash
istioctl bug-report --full-secrets
```

Be careful with this - the archive will contain private keys and certificates. Don't share it publicly.

## Analyzing the Bug Report

Once you have the archive, extract and explore it:

```bash
tar xzf bug-report.tar.gz
cd bug-report
```

### Check Control Plane Health First

```bash
# Istiod logs - look for errors
grep -i error istio-system/istiod-*/logs.txt

# Proxy sync status
cat istio-system/proxy-status.json | python3 -m json.tool
```

### Check Specific Pod Issues

```bash
# Pod proxy logs
cat default/httpbin-abc123/istio-proxy-logs.txt | tail -100

# Look for NACKs (config rejections)
grep -i nack default/httpbin-abc123/istio-proxy-logs.txt

# Check if the pod was receiving config updates
grep "Received" default/httpbin-abc123/istio-proxy-logs.txt
```

### Check Configuration

```bash
# Look at all VirtualServices
cat istio-resources/virtualservices.yaml

# Check for conflicting DestinationRules
cat istio-resources/destinationrules.yaml
```

### Check Stats for Errors

```bash
# Look for 5xx errors
grep "rq_5xx" default/httpbin-abc123/stats.txt

# Check circuit breaker state
grep "circuit_breaker" default/httpbin-abc123/stats.txt

# Check upstream connection failures
grep "upstream_cx_connect_fail" default/httpbin-abc123/stats.txt
```

## Using Bug Reports for Offline Analysis

Even if you're not filing a bug, the report is useful for offline analysis. For example, you can run `istioctl analyze` against the collected configs:

```bash
istioctl analyze istio-resources/*.yaml --use-kube=false
```

Or you can feed the config dumps into tools like Envoy's config validation:

```bash
python3 -m json.tool default/httpbin-abc123/config_dump.json > formatted-config.json
```

## Automated Collection in CI/CD

If you want to collect bug reports automatically when tests fail:

```bash
#!/bin/bash
# Run at the end of integration tests if they fail

if [ $TEST_EXIT_CODE -ne 0 ]; then
  istioctl bug-report \
    --duration 15m \
    --dir /artifacts/istio-debug \
    --filename "test-failure-$(date +%Y%m%d-%H%M%S).tar.gz"
fi
```

This gives you diagnostic data every time tests fail, without having to manually reproduce the issue.

## Scrubbing Sensitive Data

Before sharing a bug report externally, consider scrubbing sensitive information:

```bash
# Extract
tar xzf bug-report.tar.gz

# Remove or redact sensitive files
find bug-report -name "*.yaml" -exec sed -i 's/password:.*/password: REDACTED/g' {} \;
find bug-report -name "*.yaml" -exec sed -i 's/token:.*/token: REDACTED/g' {} \;

# Re-archive
tar czf bug-report-scrubbed.tar.gz bug-report/
```

Also check the pod logs for any application-level secrets that might have been logged.

## Bug Report for Specific Issues

### For Networking Issues

Focus on proxy configs and stats:

```bash
istioctl bug-report --include default --duration 10m
```

Then in the report, check:
- `config_dump.json` for the affected pods
- `stats.txt` for error counters
- `istio-proxy-logs.txt` for connection errors

### For Performance Issues

Collect with a wider time window to capture performance trends:

```bash
istioctl bug-report --duration 2h
```

Check:
- Memory and CPU stats in pod descriptions
- `pilot_xds_push_time` and `pilot_proxy_convergence_time` in Istiod stats
- Envoy stats for high latency (`upstream_rq_time`)

### For Upgrade Issues

If you hit issues during an Istio upgrade:

```bash
istioctl bug-report --include istio-system
```

Focus on Istiod logs showing version mismatches and proxy-status showing revision differences.

## Summary

The `istioctl bug-report` command is the fastest way to collect comprehensive diagnostic data from your Istio mesh. Whether you're filing an issue, asking for community help, or just creating a debug snapshot, it saves you from manually running dozens of kubectl and istioctl commands. Scope the collection with namespace filters and time durations to keep it manageable, and always scrub sensitive data before sharing externally.
