# How to Troubleshoot Logging Issues in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging

Description: A systematic guide to diagnosing and resolving common logging issues in Rancher including collection, routing, and delivery problems.

When logging stops working in Rancher, it can leave you unable to debug applications or meet compliance requirements. This guide provides a systematic approach to troubleshooting logging issues, covering every component in the pipeline from log collection to delivery.

## Prerequisites

- Rancher v2.6 or later.
- kubectl access to the affected cluster.
- Cluster admin permissions.

## Understanding the Logging Pipeline

Rancher's logging pipeline consists of:

1. **Fluent Bit** (DaemonSet): Collects logs from container log files on each node.
2. **Fluentd** (StatefulSet): Receives logs from Fluent Bit, applies filters, and routes to outputs.
3. **Logging Operator**: Watches Flow, ClusterFlow, Output, and ClusterOutput resources and generates Fluentd configuration.
4. **Destination** (Elasticsearch, Loki, Splunk, etc.): Stores the logs.

Issues can occur at any point in this pipeline.

## Step 1: Check Component Health

Start by verifying all logging components are running:

```bash
# Check all pods in the logging namespace

kubectl get pods -n cattle-logging-system

# Check DaemonSet (Fluent Bit should run on every node)
kubectl get ds -n cattle-logging-system

# Check node count matches Fluent Bit pod count
kubectl get nodes --no-headers | wc -l
kubectl get pods -n cattle-logging-system -l app.kubernetes.io/name=fluentbit --no-headers | wc -l
```

If any pods are not running, describe them:

```bash
kubectl describe pod <pod-name> -n cattle-logging-system
```

Common pod issues:
- **Pending**: Insufficient resources or scheduling constraints.
- **CrashLoopBackOff**: Configuration error or dependency issue.
- **ImagePullBackOff**: Image registry access problem.

## Step 2: Troubleshoot Fluent Bit (Collection)

Fluent Bit collects logs from `/var/log/containers/` on each node.

### Check Fluent Bit Logs

```bash
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentbit --tail=100
```

### Verify Fluent Bit Can Read Log Files

```bash
kubectl exec -n cattle-logging-system <fluentbit-pod> -- ls -la /var/log/containers/ | head -20
```

### Check Fluent Bit Configuration

```bash
kubectl get secret <logging-name>-fluentbit -n cattle-logging-system \
  -o jsonpath="{.data['fluent-bit\.conf']}" | base64 --decode
```

### Common Fluent Bit Issues

**No log files found**: The container runtime may use a different log path. Check if the log directory is correctly mounted.

```bash
kubectl get pod <fluentbit-pod> -n cattle-logging-system -o yaml | grep -A5 volumeMounts
```

**Permission denied**: Fluent Bit needs read access to log files. Check if the pod runs with sufficient privileges.

**Memory issues**: Fluent Bit may OOM if buffers are too large:

```bash
kubectl top pods -n cattle-logging-system -l app.kubernetes.io/name=fluentbit
```

## Step 3: Troubleshoot Fluentd (Processing and Routing)

Fluentd receives logs from Fluent Bit, applies filters, and sends to outputs.

### Check Fluentd Logs

```bash
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd --tail=200
```

Look for:
- Connection errors to output destinations.
- Buffer overflow warnings.
- Configuration reload errors.
- Filter processing errors.

### Check Fluentd Configuration

The logging operator generates Fluentd configuration from Flow and Output resources:

```bash
kubectl get secret <logging-name>-fluentd-app -n cattle-logging-system \
  -o jsonpath="{.data['fluentd\.conf']}" | base64 --decode
```

### Check Buffer Status

```bash
kubectl exec -n cattle-logging-system <fluentd-pod> -c fluentd -- ls -la /buffers/
kubectl exec -n cattle-logging-system <fluentd-pod> -c fluentd -- sh -c 'du -sh /buffers/*'
```

If buffers are large, the destination may be unreachable or slow:

```bash
# Check buffer disk usage
kubectl exec -n cattle-logging-system <fluentd-pod> -c fluentd -- df -h /buffers
```

### Common Fluentd Issues

**High memory usage**: Fluentd may need more memory for large buffers or complex filters.

```bash
kubectl top pods -n cattle-logging-system -l app.kubernetes.io/name=fluentd
```

**Configuration errors after Flow changes**: Check the operator logs:

```bash
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=rancher-logging
```

## Step 4: Troubleshoot the Logging Operator

The logging operator watches for CRD changes and generates Fluentd configuration.

```bash
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=rancher-logging --tail=100
```

### Verify CRDs Are Registered

```bash
kubectl get crds | grep logging.banzaicloud.io
```

Expected CRDs:
- `clusterflows.logging.banzaicloud.io`
- `clusteroutputs.logging.banzaicloud.io`
- `flows.logging.banzaicloud.io`
- `outputs.logging.banzaicloud.io`
- `loggings.logging.banzaicloud.io`

### Check Flow and Output Status

```bash
# List all flows and outputs
kubectl get clusterflows -n cattle-logging-system
kubectl get clusteroutputs -n cattle-logging-system
kubectl get flows --all-namespaces
kubectl get outputs --all-namespaces

# Describe for status details
kubectl describe clusterflow <name> -n cattle-logging-system
kubectl describe clusteroutput <name> -n cattle-logging-system
```

## Step 5: Troubleshoot Destination Connectivity

### Test Network Connectivity

```bash
# Test from within the Fluentd pod
kubectl exec -n cattle-logging-system <fluentd-pod> -c fluentd -- \
  ruby -rnet/http -ruri -ropenssl -e 'uri = URI("https://elasticsearch.logging.svc:9200"); req = Net::HTTP::Get.new(uri); req.basic_auth("elastic", "password"); Net::HTTP.start(uri.host, uri.port, use_ssl: true, verify_mode: OpenSSL::SSL::VERIFY_NONE) { |http| res = http.request(req); puts "HTTP #{res.code}"; puts res.body }'

# Test DNS resolution
kubectl exec -n cattle-logging-system <fluentd-pod> -c fluentd -- \
  ruby -rsocket -e 'puts Addrinfo.getaddrinfo("elasticsearch.logging.svc.cluster.local", nil).map(&:ip_address).uniq'
```

### Check for TLS Issues

```bash
kubectl exec -n cattle-logging-system <fluentd-pod> -c fluentd -- \
  ruby -rsocket -ropenssl -e 'ctx = OpenSSL::SSL::SSLContext.new; ctx.verify_mode = OpenSSL::SSL::VERIFY_NONE; tcp = TCPSocket.new("elasticsearch.logging.svc", 9200); ssl = OpenSSL::SSL::SSLSocket.new(tcp, ctx); ssl.hostname = "elasticsearch.logging.svc" if ssl.respond_to?(:hostname=); ssl.connect; puts ssl.peer_cert.to_text; ssl.close; tcp.close'
```

### Verify Credentials

```bash
# Check if secrets exist
kubectl get secrets -n cattle-logging-system | grep -i elastic\|splunk\|loki\|kafka

# Decode a specific key from the secret
kubectl get secret <secret-name> -n cattle-logging-system \
  -o jsonpath="{.data['<key>']}" | base64 --decode; echo
```

## Step 6: Troubleshoot Missing Logs

If some logs appear but others are missing:

### Check Flow Match Rules

Verify that your Flow or ClusterFlow match rules include the missing namespaces or labels:

```bash
kubectl get clusterflow <name> -n cattle-logging-system -o yaml | grep -A 20 match
```

### Check Namespace Labels

If using namespace selectors, verify labels:

```bash
kubectl get namespace <namespace> --show-labels
```

### Check Pod Labels

If using label selectors, verify pod labels match:

```bash
kubectl get pods -n <namespace> --show-labels
```

### Check Grep Filters

Overly aggressive grep filters may exclude legitimate logs:

```bash
kubectl get clusterflow <name> -n cattle-logging-system -o yaml | grep -A 10 grep
```

## Step 7: Troubleshoot Duplicate Logs

If logs appear duplicated:

- Check for multiple Flows or ClusterFlows matching the same pods.
- Ensure you do not have both a Flow and ClusterFlow routing the same logs.
- Check if Fluent Bit is configured multiple times (multiple logging installations).

```bash
# List all flows
kubectl get clusterflows,flows --all-namespaces

# Check for duplicate match rules
kubectl get clusterflows -n cattle-logging-system -o yaml | grep -B5 -A20 match
```

## Step 8: Restart Components

If troubleshooting identifies configuration issues that have been fixed:

```bash
# Restart Fluent Bit
kubectl rollout restart daemonset/rancher-logging-fluentbit -n cattle-logging-system

# Restart Fluentd
kubectl rollout restart statefulset/rancher-logging-fluentd -n cattle-logging-system

# Restart the logging operator
kubectl rollout restart deployment/rancher-logging -n cattle-logging-system
```

## Step 9: Collect Diagnostic Information

When escalating an issue, gather the following:

```bash
# Pod status
kubectl get pods -n cattle-logging-system -o wide

# Events
kubectl get events -n cattle-logging-system --sort-by='.lastTimestamp' | tail -30

# Fluent Bit logs
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentbit --tail=200 > fluentbit-logs.txt

# Fluentd logs
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd --tail=200 > fluentd-logs.txt

# Operator logs
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=rancher-logging --tail=200 > operator-logs.txt

# Resource definitions
kubectl get clusterflows,clusteroutputs,flows,outputs --all-namespaces -o yaml > logging-resources.yaml

# Resource usage
kubectl top pods -n cattle-logging-system
```

## Step 10: Performance Optimization

If logging is working but causing performance issues:

**High CPU on Fluentd**: Reduce filter complexity, increase flush_interval, or reduce log volume with grep filters.

**High memory on Fluentd**: Reduce buffer sizes or add file-based buffering.

**High disk usage**: Check buffer directories and reduce total_limit_size.

**Slow log delivery**: Increase flush_thread_count and reduce flush_interval.

```yaml
buffer:
  type: file
  path: /buffers/output
  chunk_limit_size: 8MB
  total_limit_size: 2GB
  flush_interval: 5s
  flush_thread_count: 4
  retry_max_interval: 30s
```

## Summary

Troubleshooting logging in Rancher follows the pipeline from collection (Fluent Bit) through processing (Fluentd) to delivery (destination). Check pod health first, then examine logs for each component, verify network connectivity to destinations, and review Flow/Output configurations. Most issues stem from destination connectivity, incorrect match rules, or resource constraints. Always gather diagnostic information before making changes, and restart components after fixing configuration issues.
