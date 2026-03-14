# Preventing Single-Stream Performance Degradation in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, Proactive Monitoring, Single-Stream

Description: Proactive strategies and configurations to prevent single-stream TCP performance degradation in Cilium-managed Kubernetes clusters before problems occur.

---

## Introduction

Prevention is always better than remediation when it comes to network performance. Single-stream TCP throughput in Cilium can degrade silently as clusters grow, policies accumulate, and configurations drift. By the time users notice slow transfers, the root cause may be buried under layers of changes.

This guide covers proactive measures you can implement from day one to ensure single-stream performance remains stable. These include establishing baselines, setting up automated benchmarking, configuring Cilium optimally from the start, and creating alerting rules that fire before users notice degradation.

The core principle is continuous measurement. You cannot prevent what you do not measure. A 5% weekly regression in single-stream throughput compounds into a 50%+ loss over a few months if left unchecked.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- Prometheus and Grafana for monitoring
- CI/CD pipeline access for automated benchmarking
- `cilium` CLI installed
- Initial baseline measurements recorded

## Establishing Performance Baselines

Create a CronJob that runs regular single-stream benchmarks and exports results to Prometheus:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-perf-baseline
  namespace: monitoring
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: benchmark
            image: networkstatic/iperf3
            command:
            - /bin/sh
            - -c
            - |
              # Run single-stream test and push to Pushgateway
              RESULT=$(iperf3 -c iperf-server.monitoring -t 30 -P 1 -J)
              BPS=$(echo "$RESULT" | jq '.end.sum_sent.bits_per_second')
              # Push metric to Prometheus Pushgateway
              cat <<METRIC | curl --data-binary @- http://pushgateway.monitoring:9091/metrics/job/cilium_perf
              cilium_single_stream_throughput_bps $BPS
              METRIC
          restartPolicy: OnFailure
```

Deploy a persistent iperf3 server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iperf-server
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: iperf-server
  template:
    metadata:
      labels:
        app: iperf-server
    spec:
      containers:
      - name: iperf3
        image: networkstatic/iperf3
        args: ["-s"]
        ports:
        - containerPort: 5201
---
apiVersion: v1
kind: Service
metadata:
  name: iperf-server
  namespace: monitoring
spec:
  selector:
    app: iperf-server
  ports:
  - port: 5201
```

## Optimal Initial Configuration

Start with the highest-performance Cilium configuration from day one:

```bash
helm install cilium cilium/cilium --namespace kube-system \
  --set tunnel=disabled \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR="10.0.0.0/8" \
  --set kubeProxyReplacement=true \
  --set bpf.masquerade=true \
  --set bpf.hostLegacyRouting=false \
  --set bpf.ctGlobalTCPMax=524288 \
  --set bpf.ctGlobalAnyMax=262144 \
  --set bpf.natMax=524288 \
  --set prometheus.enabled=true \
  --set operator.prometheus.enabled=true \
  --set hubble.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution,icmp,httpV2:exemplars=true;labelsContext=source_ip\,source_namespace\,source_workload\,destination_ip\,destination_namespace\,destination_workload}"
```

## Setting Up Alerting

Create Prometheus alerting rules that fire when throughput drops:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-perf-alerts
  namespace: monitoring
spec:
  groups:
  - name: cilium-single-stream
    rules:
    - alert: CiliumSingleStreamThroughputDegraded
      expr: |
        cilium_single_stream_throughput_bps
        < 0.85 * avg_over_time(cilium_single_stream_throughput_bps[30d])
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Single-stream throughput dropped below 85% of 30-day average"
    - alert: CiliumConntrackTableHigh
      expr: |
        cilium_bpf_map_ops_total{map_name=~".*ct.*"} > 400000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Conntrack table approaching capacity"
```

## Policy Impact Assessment

Before deploying new network policies, test their impact on throughput:

```bash
#!/bin/bash
# policy-perf-check.sh - Run before applying new policies

# Measure current throughput
BEFORE=$(kubectl exec iperf-client -- iperf3 -c iperf-server.monitoring -t 10 -P 1 -J | jq '.end.sum_sent.bits_per_second')

# Apply the policy
kubectl apply -f new-policy.yaml

# Wait for policy to propagate
sleep 10

# Measure throughput after policy
AFTER=$(kubectl exec iperf-client -- iperf3 -c iperf-server.monitoring -t 10 -P 1 -J | jq '.end.sum_sent.bits_per_second')

# Calculate impact
IMPACT=$(echo "scale=2; (($AFTER - $BEFORE) / $BEFORE) * 100" | bc)
echo "Throughput impact: ${IMPACT}%"

if (( $(echo "$IMPACT < -10" | bc -l) )); then
  echo "WARNING: Policy caused >10% throughput regression"
  kubectl delete -f new-policy.yaml
  echo "Policy rolled back"
fi
```

## Kernel Parameter Persistence

Ensure kernel tuning survives node reboots with a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-tuner
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-tuner
  template:
    metadata:
      labels:
        app: node-tuner
    spec:
      hostNetwork: true
      hostPID: true
      initContainers:
      - name: tune
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          sysctl -w net.core.rmem_max=16777216
          sysctl -w net.core.wmem_max=16777216
          sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
          sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
          sysctl -w net.ipv4.tcp_congestion_control=bbr
          sysctl -w net.core.netdev_max_backlog=5000
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
```

## Verification

Verify your prevention measures are active:

```bash
# Check daily benchmark job is running
kubectl get cronjobs -n monitoring

# Verify Prometheus is collecting metrics
curl -s http://prometheus.monitoring:9090/api/v1/query?query=cilium_single_stream_throughput_bps

# Confirm Cilium configuration
cilium config view | grep -E "tunnel|routing-mode|bpf-host-routing"

# Validate alerting rules are loaded
kubectl get prometheusrules -n monitoring
```

## Troubleshooting

- **CronJob not running**: Check RBAC permissions and image pull policies.
- **Pushgateway metrics missing**: Verify the Pushgateway service is reachable from the benchmark pod.
- **Alerts not firing**: Confirm PrometheusRule CRD is installed and Prometheus is configured to read it.
- **Policy check script false positives**: Increase test duration to 30 seconds for more stable results.

## Conclusion

Preventing single-stream performance degradation in Cilium requires a combination of optimal initial configuration, continuous automated benchmarking, proactive alerting, and disciplined policy change management. By measuring daily and alerting on regressions, you catch problems before they affect production workloads. The investment in automation pays for itself many times over compared to the cost of diagnosing performance issues reactively.
