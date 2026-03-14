# Preventing Multi-Stream Performance Degradation in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, Multi-Stream, Monitoring

Description: Proactive strategies to prevent multi-stream TCP performance degradation in Cilium clusters, including automated testing, capacity planning, and configuration guardrails.

---

## Introduction

Multi-stream performance in Cilium can degrade gradually as clusters scale, new policies are added, and node configurations drift. Since multi-stream throughput depends on the coordinated behavior of multiple CPU cores, NIC queues, and BPF programs, even small changes to one component can create disproportionate performance impacts.

Preventing degradation requires ongoing monitoring, automated regression testing, and configuration management that ensures all nodes maintain optimal settings. This guide covers the proactive measures that keep multi-stream performance stable over time.

The key principle is that multi-stream performance is a system property, not a component property. You must monitor the system as a whole, not just individual pieces.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Prometheus and Grafana monitoring stack
- CI/CD pipeline for automated testing
- GitOps workflow for configuration management

## Automated Multi-Stream Regression Testing

Create a CronJob that tests multi-stream performance daily:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: multistream-regression-test
  namespace: monitoring
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: tester
            image: networkstatic/iperf3
            command:
            - /bin/sh
            - -c
            - |
              SERVER="iperf-server.monitoring"
              for STREAMS in 1 8 32; do
                BPS=$(iperf3 -c $SERVER -t 30 -P $STREAMS -J | \
                  jq '.end.sum_sent.bits_per_second')
                # Push to Pushgateway
                cat <<METRIC | curl --data-binary @- \
                  http://pushgateway.monitoring:9091/metrics/job/cilium_multistream
                cilium_multi_stream_throughput_bps{streams="$STREAMS"} $BPS
                METRIC
              done
          restartPolicy: OnFailure
```

## Configuration Drift Detection

Use a DaemonSet to verify node configuration hasn't drifted:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: config-validator
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: config-validator
  template:
    metadata:
      labels:
        app: config-validator
    spec:
      hostNetwork: true
      containers:
      - name: validator
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            # Check NIC queues
            QUEUES=$(ethtool -l eth0 2>/dev/null | grep "Combined" | tail -1 | awk '{print $2}')
            CPUS=$(nproc)
            if [ "$QUEUES" != "$CPUS" ]; then
              echo "WARNING: NIC queues ($QUEUES) != CPUs ($CPUS)"
              ethtool -L eth0 combined $CPUS 2>/dev/null
            fi

            # Check ring buffer sizes
            RX_RING=$(ethtool -g eth0 2>/dev/null | grep -A4 "Current" | grep "RX:" | awk '{print $2}')
            if [ "$RX_RING" -lt 4096 ] 2>/dev/null; then
              echo "WARNING: RX ring buffer too small ($RX_RING)"
              ethtool -G eth0 rx 4096 2>/dev/null
            fi

            sleep 3600
          done
```

## Alerting Rules for Multi-Stream

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-multistream-alerts
  namespace: monitoring
spec:
  groups:
  - name: cilium-multistream
    rules:
    - alert: MultiStreamThroughputRegression
      expr: |
        cilium_multi_stream_throughput_bps{streams="32"}
        < 0.80 * avg_over_time(cilium_multi_stream_throughput_bps{streams="32"}[30d])
      for: 2h
      labels:
        severity: warning
      annotations:
        summary: "32-stream throughput dropped below 80% of 30-day average"
    - alert: MultiStreamScalingDegraded
      expr: |
        cilium_multi_stream_throughput_bps{streams="32"}
        / cilium_multi_stream_throughput_bps{streams="1"} < 10
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Multi-stream scaling ratio below expected 10x"
```

## Capacity Planning

Track throughput trends to predict when you will need hardware upgrades:

```bash
# Query Prometheus for 90-day trend
curl -s "http://prometheus:9090/api/v1/query_range" \
  --data-urlencode "query=cilium_multi_stream_throughput_bps{streams='32'}" \
  --data-urlencode "start=$(date -d '90 days ago' +%s)" \
  --data-urlencode "end=$(date +%s)" \
  --data-urlencode "step=86400" | jq '.data.result[0].values'
```

## Pre-Deployment Checks

Add a pre-deployment hook to your CI pipeline:

```bash
#!/bin/bash
# pre-deploy-perf-check.sh

echo "Running pre-deployment multi-stream performance check..."

# Snapshot current performance
BEFORE=$(kubectl exec perf-test-client -- \
  iperf3 -c iperf-server.monitoring -t 15 -P 16 -J | \
  jq '.end.sum_sent.bits_per_second')

echo "Current throughput: $BEFORE bps"

# Deploy changes
kubectl apply -f deployment.yaml

# Wait for rollout
kubectl rollout status deployment/my-app --timeout=120s

# Measure post-deployment
AFTER=$(kubectl exec perf-test-client -- \
  iperf3 -c iperf-server.monitoring -t 15 -P 16 -J | \
  jq '.end.sum_sent.bits_per_second')

CHANGE=$(echo "scale=4; ($AFTER - $BEFORE) / $BEFORE * 100" | bc)
echo "Performance change: ${CHANGE}%"

if (( $(echo "$CHANGE < -5" | bc -l) )); then
  echo "FAIL: >5% performance regression detected. Rolling back."
  kubectl rollout undo deployment/my-app
  exit 1
fi
```

## Verification

```bash
# Check CronJobs are running
kubectl get cronjobs -n monitoring

# Verify config validator DaemonSet
kubectl get ds config-validator -n kube-system

# Check alerting rules are loaded
kubectl get prometheusrules -n monitoring

# Review recent alert history
kubectl exec -n monitoring prometheus-0 -- \
  promtool query instant http://localhost:9090 'ALERTS{alertname=~".*MultiStream.*"}'
```

## Troubleshooting

- **CronJob metrics missing**: Check Pushgateway logs and network policies allowing monitoring namespace traffic.
- **Config validator fixing settings repeatedly**: Investigate what keeps changing NIC settings (cloud provider agent, NetworkManager).
- **Alerts too noisy**: Increase the `for` duration or adjust the threshold percentage.
- **Pre-deploy check blocks unrelated deployments**: Scope the check to only run for network-affecting changes.

## Conclusion

Preventing multi-stream performance degradation requires continuous automated testing, configuration drift detection, and alerting on throughput trends. By catching regressions within 24 hours through daily benchmarks and validating every deployment with performance gates, you can maintain consistent multi-stream throughput as your cluster evolves. The investment in automation is essential because multi-stream performance depends on many interacting components that can each degrade independently.
