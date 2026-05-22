# How to Collect Istio Bug Reports with istioctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istioctl, Bug Report, Troubleshooting, Kubernetes

Description: Learn how to use istioctl bug-report to collect comprehensive diagnostic information from your Istio mesh for troubleshooting and bug reports.

---

When you run into an Istio issue that you can't solve on your own, you'll probably need to file a bug report or ask for help on the Istio community forums. The `istioctl bug-report` command collects everything someone would need to diagnose the problem - logs, configurations, proxy states, resource definitions, and cluster information. It packages it all into a single archive that you can share.

Even if you're not filing a bug, the command is useful for creating a snapshot of your mesh state that you can analyze offline.

## Running a Basic Bug Report

```bash
istioctl bug-report
```

This collects data from the entire mesh and creates a compressed tar.gz file in the current directory:

```text
Target cluster context: my-cluster
Running with the following config...
Running Istio analyze on all namespaces and report as below:
...
Creating an archive at /current/directory/bug-report.tar.gz.
```

The file can be quite large depending on your mesh size. For a medium-sized mesh with a few hundred pods, expect 50-200MB.

## What Gets Collected

The bug report archive contains several directories of information:

### Cluster Information

```text
cluster/
  cluster-context
  kubectl-version
  k8s-cluster-resources
  k8s-resources
  crs
  events
  secrets
```

General Kubernetes cluster state that provides context for the Istio-specific data.

### Istio Control Plane

```text
istio/
  istio-system/
    istiod-*/
      discovery.log
      debug/
        syncz
        configz
        endpointz
      metrics
proxies/
  istio-system/
    istio-ingressgateway-*/
      istio-proxy.log
      config_dump?include_eds
      stats/
        prometheus
```

Istiod logs, gateway logs, control plane debug endpoints, and gateway proxy data. This is the most important data for control plane issues.

### Per-Pod Proxy Data

```text
proxies/
  default/
    httpbin-abc123/
      istio-proxy.log
      config_dump?include_eds
      clusters
      listeners
      stats/
        prometheus
      server_info
```

For each selected pod with a sidecar, the report collects proxy logs, Envoy admin output such as configuration, clusters, listeners, server info, and Prometheus-format statistics.

### Istio Resources

```text
cluster/
  crs
```

Istio custom resources are collected into the `cluster/crs` file.

## Scoping the Bug Report

Collecting data from the entire mesh takes time and creates huge archives. Scope it down to what's relevant.

### By Namespace

```bash
istioctl bug-report --include default,production
```

Only targets proxy logs and namespace-scoped resources from the `default` and `production` namespaces. The Istio control plane namespace is still included for control plane data.

### By Time Duration

```bash
istioctl bug-report --duration 30m
```

Only collects logs from the last 30 minutes. This keeps log volumes manageable and focuses on recent events.

### By Specific Pods

If you know which pods are affected:

```bash
istioctl bug-report --include "default//httpbin-*,default//sleep-*"
```

The include pattern uses Istio's filter syntax with `*` glob matching, so you can match multiple pods.

### Excluding Namespaces

To skip namespaces with lots of pods that aren't relevant:

```bash
istioctl bug-report --exclude monitoring,logging
```

## Controlling the Output

### Output Directory

```bash
istioctl bug-report --output-dir /tmp/istio-debug
```

### Temporary Directory

```bash
istioctl bug-report --dir /tmp/istio-debug-work
```

The `--dir` flag controls temporary artifact storage while the report is being collected.

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

grep -i error istio/istio-system/istiod-*/discovery.log

# Proxy sync status from Istiod debug output
for f in istio/istio-system/istiod-*/debug/syncz; do
  python3 -m json.tool "$f"
done
```

### Check Specific Pod Issues

```bash
# Pod proxy logs
cat proxies/default/httpbin-abc123/istio-proxy.log | tail -100

# Look for NACKs (config rejections)
grep -i nack proxies/default/httpbin-abc123/istio-proxy.log

# Check if the pod was receiving config updates
grep "Received" proxies/default/httpbin-abc123/istio-proxy.log
```

### Check Configuration

```bash
# Look at all collected custom resources
cat cluster/crs

# Search collected custom resources for DestinationRules
grep -n "kind: DestinationRule" cluster/crs
```

### Check Stats for Errors

```bash
# Look for 5xx errors
grep "rq_5xx" proxies/default/httpbin-abc123/stats/prometheus

# Check circuit breaker state
grep "circuit_breaker" proxies/default/httpbin-abc123/stats/prometheus

# Check upstream connection failures
grep "upstream_cx_connect_fail" proxies/default/httpbin-abc123/stats/prometheus
```

## Using Bug Reports for Offline Analysis

Even if you're not filing a bug, the report is useful for offline analysis. For example, you can run `istioctl analyze` against the collected configs:

```bash
istioctl analyze cluster/crs --use-kube=false
```

Or you can feed the config dumps into tools like Envoy's config validation:

```bash
python3 -m json.tool 'proxies/default/httpbin-abc123/config_dump?include_eds' > formatted-config.json
```

## Automated Collection in CI/CD

If you want to collect bug reports automatically when tests fail:

```bash
#!/bin/bash
# Run at the end of integration tests if they fail

if [ "${TEST_EXIT_CODE:-0}" -ne 0 ]; then
  istioctl bug-report \
    --duration 15m \
    --output-dir /artifacts/istio-debug
  mv /artifacts/istio-debug/bug-report.tar.gz \
    "/artifacts/istio-debug/test-failure-$(date +%Y%m%d-%H%M%S).tar.gz"
fi
```

This gives you diagnostic data every time tests fail, without having to manually reproduce the issue.

## Scrubbing Sensitive Data

Before sharing a bug report externally, consider scrubbing sensitive information:

```bash
# Extract
tar xzf bug-report.tar.gz

# Remove or redact sensitive files
grep -rlE 'password:|token:' bug-report/ | xargs -r sed -i \
  -e 's/password:.*/password: REDACTED/g' \
  -e 's/token:.*/token: REDACTED/g'

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
- `config_dump?include_eds` for the affected pods
- `stats/prometheus` for error counters
- `istio-proxy.log` for connection errors

### For Performance Issues

Collect with a wider time window to capture performance trends:

```bash
istioctl bug-report --duration 2h
```

Check:
- Resource requests, limits, and restart state in `cluster/k8s-resources`
- `pilot_xds_push_time` and `pilot_proxy_convergence_time` in Istiod stats
- Envoy stats for high latency (`upstream_rq_time`)

### For Upgrade Issues

If you hit issues during an Istio upgrade:

```bash
istioctl bug-report --include istio-system
```

Focus on Istiod logs showing version mismatches and the `debug/syncz` output showing proxy revision differences.

## Summary

The `istioctl bug-report` command is the fastest way to collect comprehensive diagnostic data from your Istio mesh. Whether you're filing an issue, asking for community help, or just creating a debug snapshot, it saves you from manually running dozens of kubectl and istioctl commands. Scope the collection with namespace filters and time durations to keep it manageable, and always scrub sensitive data before sharing externally.
