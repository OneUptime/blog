# How to Handle Certificate Renewals on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Certificates, TLS, Security, Kubernetes, PKI

Description: Learn how to monitor, renew, and manage TLS certificates on Talos Linux clusters to prevent expiration-related outages and maintain secure communications.

---

Certificates are the backbone of secure communication in a Kubernetes cluster. Every component talks to every other component over TLS, and those TLS connections rely on certificates that have expiration dates. When a certificate expires, things break. The API server stops accepting connections, kubelet cannot communicate with the control plane, and your cluster goes down hard. This is entirely preventable with proper certificate management, and Talos Linux gives you the tools to handle it.

## Understanding Certificates in Talos Linux

Talos Linux uses a multi-layered certificate system. There are several types of certificates you need to be aware of:

**Talos API certificates** - These secure the communication between `talosctl` and the Talos API on each node. They are generated during cluster bootstrap.

**Kubernetes PKI certificates** - These include the CA certificate, API server certificates, kubelet certificates, etcd certificates, and more. They are essential for Kubernetes to function.

**etcd certificates** - Separate from the Kubernetes certificates, these secure etcd peer and client communication.

```bash
# View the Talos-level certificates
talosctl get certificate -n <control-plane-ip>

# Check specific certificate details
talosctl get certificate kubernetes -n <control-plane-ip> -o yaml
```

## Checking Certificate Expiration Dates

The first step in certificate management is knowing when your certificates expire. Check this regularly.

```bash
# Check Kubernetes PKI certificate expiration
talosctl get certificate -n <control-plane-ip> -o json | \
    jq -r '.[] | "\(.metadata.id): \(.spec.notAfter)"'

# Check the Kubernetes API server certificate
kubectl get --raw /healthz -v=6 2>&1 | grep -i cert

# For a more detailed view, use openssl
talosctl read /system/secrets/kubernetes/certs/apiserver.crt -n <control-plane-ip> | \
    openssl x509 -noout -dates
```

You can also build a comprehensive certificate status check:

```bash
#!/bin/bash
# check-certs.sh - Check certificate expiration dates

CONTROL_PLANE_IP="10.0.0.1"
WARNING_DAYS=30
CRITICAL_DAYS=7

echo "Certificate Expiration Report"
echo "============================="

# List all certificates and their expiration
talosctl get certificate -n "$CONTROL_PLANE_IP" -o json | \
    jq -r '.[] | "\(.metadata.id) \(.spec.notAfter)"' | \
    while read -r cert_id expiry_date; do
        if [ -z "$expiry_date" ] || [ "$expiry_date" = "null" ]; then
            echo "$cert_id: No expiration date (CA or self-signed)"
            continue
        fi

        # Calculate days until expiration
        expiry_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$expiry_date" +%s 2>/dev/null || \
                       date -d "$expiry_date" +%s 2>/dev/null)
        now_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

        if [ "$days_left" -lt "$CRITICAL_DAYS" ]; then
            status="CRITICAL"
        elif [ "$days_left" -lt "$WARNING_DAYS" ]; then
            status="WARNING"
        else
            status="OK"
        fi

        echo "[$status] $cert_id: $days_left days remaining (expires: $expiry_date)"
    done
```

## Automatic Certificate Rotation in Talos

Talos Linux includes built-in support for automatic certificate rotation for many certificate types. By default, Talos will attempt to renew certificates before they expire.

The kubelet client certificates are automatically rotated by the kubelet itself using the Kubernetes certificate signing request (CSR) mechanism. You can verify this is working:

```bash
# Check kubelet certificate rotation
kubectl get csr

# Look for approved CSRs
kubectl get csr -o json | jq '.items[] | {name: .metadata.name, condition: .status.conditions[0].type}'
```

## Manual Certificate Renewal

For cases where automatic renewal is not sufficient, or when you need to force a renewal, Talos provides the `talosctl` commands:

```bash
# Renew all Kubernetes certificates
talosctl config rotate-certs -n <control-plane-ip>

# This will regenerate the Talos API certificates
# and the Kubernetes PKI certificates
```

After renewing certificates, you need to update your `talosconfig` file because the Talos API certificate has changed:

```bash
# Generate a new talosconfig with the updated certificates
talosctl config merge /path/to/new/talosconfig
```

## Renewing the Kubernetes CA Certificate

The CA certificate is the most critical certificate in your cluster. When it expires, every certificate signed by it becomes invalid. CA certificates typically have a long lifespan (10 years by default), but you should plan for renewal well in advance.

```bash
# Check the CA certificate expiration
talosctl read /system/secrets/kubernetes/certs/ca.crt -n <control-plane-ip> | \
    openssl x509 -noout -dates -subject

# The output will show:
# notBefore=Jan 15 00:00:00 2026 GMT
# notAfter=Jan 15 00:00:00 2036 GMT
```

Renewing the CA is a more involved process because all subordinate certificates must be re-issued with the new CA. Plan this as a major maintenance event.

## Monitoring Certificate Expiration

Set up automated monitoring to alert you before certificates expire. Here is a Prometheus-based approach:

```yaml
# cert-monitor-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-expiry
  namespace: monitoring
spec:
  groups:
  - name: certificate-expiry
    rules:
    - alert: CertificateExpiringIn30Days
      expr: |
        (x509_cert_not_after - time()) / 86400 < 30
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.subject }} expires in less than 30 days"
        description: "Certificate {{ $labels.subject }} on {{ $labels.instance }} expires in {{ $value | humanizeDuration }}"

    - alert: CertificateExpiringIn7Days
      expr: |
        (x509_cert_not_after - time()) / 86400 < 7
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.subject }} expires in less than 7 days"
```

You can also use a CronJob-based approach if you do not use Prometheus:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cert-expiry-monitor
  namespace: monitoring
spec:
  schedule: "0 8 * * *"  # Daily at 8 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: checker
            image: ghcr.io/siderolabs/talosctl:v1.9.0
            env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: monitoring-slack
                  key: webhook-url
            command:
            - /bin/sh
            - -c
            - |
              # Check each control plane node
              ALERTS=""
              for NODE in 10.0.0.1 10.0.0.2 10.0.0.3; do
                talosctl get certificate -n "$NODE" -o json | \
                  jq -r '.[] | select(.spec.notAfter != null) |
                  select((.spec.notAfter | fromdateiso8601) - now < (30*86400)) |
                  "Node '$NODE': \(.metadata.id) expires \(.spec.notAfter)"' >> /tmp/alerts.txt
              done

              if [ -s /tmp/alerts.txt ]; then
                ALERT_TEXT=$(cat /tmp/alerts.txt)
                curl -X POST "$SLACK_WEBHOOK" \
                  -H 'Content-Type: application/json' \
                  -d "{\"text\": \"Certificate expiration warning:\n$ALERT_TEXT\"}"
              fi
          restartPolicy: OnFailure
```

## Handling Certificate Issues During Upgrades

When you upgrade Talos Linux, the upgrade process handles certificate migration automatically. However, there are some edge cases to watch for:

```bash
# Before upgrading, verify certificate status
talosctl get certificate -n <control-plane-ip>

# After upgrading, verify certificates were preserved or renewed
talosctl get certificate -n <control-plane-ip>

# Check that the API server is using the correct certificate
openssl s_client -connect <control-plane-ip>:6443 -showcerts < /dev/null 2>/dev/null | \
    openssl x509 -noout -dates
```

## Troubleshooting Certificate Problems

When things go wrong with certificates, the symptoms are usually pretty clear: connection failures, TLS handshake errors, and "certificate expired" messages in logs.

```bash
# Check for certificate-related errors in Talos logs
talosctl logs controller-runtime -n <node-ip> | grep -i cert

# Check kubelet logs for certificate issues
talosctl logs kubelet -n <node-ip> | grep -i "certificate\|tls"

# Check API server logs
talosctl logs kube-apiserver -n <control-plane-ip> | grep -i "cert\|tls"
```

If a node cannot communicate with the control plane due to certificate issues, you may need to reset its certificates:

```bash
# In extreme cases, you can reset the machine configuration
# which includes regenerating certificates
talosctl reset -n <node-ip> --graceful
```

## Best Practices for Certificate Management

1. **Monitor early** - Set up alerts for 90, 60, 30, and 7 days before expiration
2. **Document your PKI** - Keep a record of all certificates, their purposes, and expiration dates
3. **Test renewals** - Practice certificate renewal in a non-production environment
4. **Automate** - Use automated monitoring and renewal where possible
5. **Keep talosconfig updated** - After any certificate changes, update your local configuration
6. **Backup certificates** - Include certificates in your backup strategy

## Conclusion

Certificate management on Talos Linux is simpler than on traditional systems because Talos handles much of the rotation automatically. But you still need to monitor expiration dates, understand the renewal process, and be prepared to handle manual renewals when needed. The most common certificate-related outages happen because nobody was watching the expiration dates. Set up monitoring, test your renewal process, and you will never be surprised by an expired certificate again.
