# How to Monitor Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Monitoring, Alerting, Hard Way

Description: A guide to monitoring Typha TLS certificate expiry, connection authentication failures, and TLS handshake health in a manually installed Calico cluster.

---

## Introduction

Monitoring Typha TLS requires tracking two categories of concerns: certificate lifecycle (expiry dates and upcoming renewals) and runtime authentication (failed handshakes and rejected connections). Certificate expiry is a silent failure - Typha and Felix continue operating until the certificates expire, at which point all Felix connections fail simultaneously. Runtime authentication monitoring catches misconfigured clients before they cause operational impact.

## Step 1: Monitor Certificate Expiry

### Kubernetes CronJob for Expiry Alerts

```bash
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: typha-cert-expiry-monitor
  namespace: calico-system
spec:
  schedule: "0 7 * * *"  # Daily at 7am
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calico-typha
          containers:
          - name: cert-check
            image: alpine:3.19
            command:
            - sh
            - -c
            - |
              apk add --no-cache openssl coreutils
              EXPIRY=$(openssl x509 -enddate -noout -in /typha-tls/tls.crt | awk -F= '{print $2}')
              EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
              NOW=$(date +%s)
              DAYS=$(( (EXPIRY_EPOCH - NOW) / 86400 ))
              echo "Typha TLS certificate expires in $DAYS days ($EXPIRY)"
              if [ "$DAYS" -lt 30 ]; then
                echo "ALERT: Certificate expires in less than 30 days"
                exit 1
              fi
            volumeMounts:
            - name: typha-tls
              mountPath: /typha-tls
              readOnly: true
          volumes:
          - name: typha-tls
            secret:
              secretName: calico-typha-tls
          restartPolicy: OnFailure
EOF
```

### Prometheus Certificate Expiry Metric

kube-state-metrics does not parse Secret contents, so use [x509-certificate-exporter](https://github.com/enix/x509-certificate-exporter) to expose certificate expiry as a Prometheus metric:

```yaml
# prometheus alert for certificate expiry

- alert: TyphaTLSCertExpiringSoon
  expr: |
    (x509_cert_not_after{secret_name="calico-typha-tls", secret_namespace="calico-system"} - time())
    < 30 * 24 * 3600
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Typha TLS certificate expires soon"
```

## Step 2: Monitor TLS Handshake Failures

TLS handshake failures appear in Typha logs as rejected connections.

```bash
# Real-time monitoring of TLS failures
kubectl logs -n calico-system deployment/calico-typha -f | \
  grep -i "tls\|reject\|handshake\|error" &

# Count TLS errors in the last hour
kubectl logs -n calico-system deployment/calico-typha \
  --since=1h | grep -ic "tls error\|connection rejected"
```

### Alerting on TLS Failures

Create a Prometheus rule to alert on unexpected connection rejections.

```yaml
- alert: TyphaTLSRejections
  expr: increase(typha_connections_dropped[5m]) > 5
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Typha is rejecting Felix connections"
    description: "{{ $value }} connections dropped in the last 5 minutes - possible TLS misconfiguration"
```

## Step 3: Monitor Active vs. Expected Connections

The number of active TLS connections to Typha should equal the number of running nodes.

```bash
# Check connection count
kubectl port-forward -n calico-system deployment/calico-typha 9091:9091 &
curl -s http://localhost:9091/metrics | grep typha_connections_active

# Compare to node count
kubectl get nodes --no-headers | wc -l
```

Alert if the ratio falls below 90%.

```yaml
- alert: TyphaConnectionCountLow
  expr: |
    typha_connections_active < (count(kube_node_info) * 0.9)
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "Fewer nodes connected to Typha than expected"
    description: "Only {{ $value }} nodes connected to Typha - possible TLS authentication failure"
```

## Step 4: Grafana Dashboard for TLS Health

Create a Grafana dashboard with these TLS-specific panels:

**Panel 1: Certificate Days Until Expiry**
- Query: Use a custom script pushing expiry to a Pushgateway metric
- Alert: Red when < 30 days, yellow when < 60 days

**Panel 2: Active TLS Connections**
- Query: `typha_connections_active`
- Expected value: equal to node count

**Panel 3: Connection Drop Rate**
- Query: `rate(typha_connections_dropped[5m])`
- Target: 0

**Panel 4: TLS Handshake Errors (from logs)**
- Source: Loki log stream for Typha pod
- Query: `{namespace="calico-system", pod=~"calico-typha.*"} |= "tls error"`

## Step 5: On-Call Runbook Integration

Add TLS monitoring steps to the Calico on-call runbook.

```bash
# Typha TLS health check (add to on-call runbook)
echo "=== Typha TLS Status ==="
kubectl get secret calico-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -enddate -noout

echo "=== Active Connections ==="
kubectl port-forward -n calico-system deployment/calico-typha 9091:9091 >/dev/null 2>&1 &
PF_PID=$!
sleep 2
curl -s http://localhost:9091/metrics | grep typha_connections_active
kill $PF_PID

echo "=== Recent TLS Errors ==="
kubectl logs -n calico-system deployment/calico-typha --since=30m | grep -i "tls\|error" | tail -10
```

## Conclusion

Monitoring Typha TLS requires both proactive certificate expiry alerting (via CronJobs or Prometheus metrics) and reactive connection failure detection (via Prometheus alerts on dropped connections and log-based TLS error tracking). Combining connection count monitoring with node count comparison provides a continuous signal that TLS authentication is functioning correctly across all Felix agents.
