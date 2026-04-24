# How to Automate Certificate Rotation in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Certificate, TLS, Automation, Cert-Manager, Security

Description: A guide to automating TLS certificate rotation in Rancher environments using cert-manager, RKE2 certificate rotation, and automated renewal workflows.

## Overview

TLS certificates have expiry dates, and certificate expiration is a common cause of outages in Kubernetes environments. Automating certificate rotation for both the Rancher management server and managed clusters is essential for operational reliability. This guide covers automating certificate rotation using cert-manager, RKE2's built-in rotation commands, and monitoring for certificate expiry.

## Rancher Server Certificate Rotation

### Using cert-manager for Automatic Renewal

The recommended approach for Rancher TLS is to use cert-manager, which automatically renews certificates before they expire.

```bash
# Install cert-manager
# Rancher was last tested with cert-manager v1.13.1
helm repo add jetstack https://charts.jetstack.io --force-update
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.1 \
  --set crds.enabled=true

# Verify the cert-manager components are running
kubectl get pods --namespace cert-manager
```

### Install Rancher with cert-manager

```bash
# Add the Rancher chart repository
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

# Install Rancher using cert-manager for automatic certificate management
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.example.com \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=admin@example.com \
  --set letsEncrypt.ingress.class=nginx \
  --set letsEncrypt.environment=production
```

On Rancher v2.9+ new installs default `agentTLSMode` to `strict`. If you keep that default with Let's Encrypt, also set `privateCA=true` and upload the Let's Encrypt CA certificate so downstream agents can trust Rancher.

### ClusterIssuer Configuration

For custom or internal CAs, install Rancher with `ingress.tls.source=secret` and have cert-manager keep the `tls-rancher-ingress` secret updated.

```yaml
# ClusterIssuer for Let's Encrypt production certificates
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
```

```yaml
# For internal CA (enterprise environments)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca-issuer
spec:
  ca:
    secretName: internal-ca-secret # Secret must exist in the cert-manager namespace
---
# Certificate resource - cert-manager renews 30 days before expiry
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: rancher-tls
  namespace: cattle-system
spec:
  secretName: tls-rancher-ingress
  issuerRef:
    name: internal-ca-issuer
    kind: ClusterIssuer
  dnsNames:
    - rancher.example.com
  duration: 2160h      # 90 days
  renewBefore: 720h    # Renew 30 days before expiry
```

## RKE2 Cluster Certificate Rotation

RKE2 manages its own client and server certificates and provides built-in commands to check and rotate them. Cluster CA certificates are handled separately with `rke2 certificate rotate-ca`.

### Check Certificate Expiry

```bash
# Check current client and server certificate expiry dates on an RKE2 node
rke2 certificate check --output table
```

### Manual Certificate Rotation

```bash
# Stop RKE2 on server nodes before rotation
systemctl stop rke2-server

# Rotate server-side client and server certificates
rke2 certificate rotate

# Start RKE2 with new certificates
systemctl start rke2-server

# On agent nodes, renew agent certificates by restarting the agent service
systemctl restart rke2-agent
```

### Automated Certificate Rotation Script

```bash
#!/bin/bash
# auto-rotate-rke2-certs.sh
# Run from cron on each RKE2 server node, with staggered schedules.

set -euo pipefail
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

CHECK_OUTPUT=$(rke2 certificate check --output table)
echo "${CHECK_OUTPUT}"

if echo "${CHECK_OUTPUT}" | awk '
  NF == 0 { next }
  $1 == "FILENAME" || $1 ~ /^-+$/ { next }
  $3 == "CertSign" { next }
  $NF != "OK" { found=1 }
  END { exit(found ? 0 : 1) }
'; then
  echo "One or more RKE2 client/server certificates need rotation. Starting rotation..."

  # Notify operators
  curl -H "Content-Type: application/json" -X POST "${SLACK_WEBHOOK}" \
    -d "{\"text\": \"RKE2 certificate rotation starting on ${HOSTNAME}\"}"

  # Stop RKE2 on the server node
  systemctl stop rke2-server

  # Rotate server-side client and server certificates
  rke2 certificate rotate

  # Start RKE2
  systemctl start rke2-server

  # Wait for cluster to be healthy
  sleep 60
  kubectl get nodes

  echo "Certificate rotation complete"
  curl -H "Content-Type: application/json" -X POST "${SLACK_WEBHOOK}" \
    -d "{\"text\": \"RKE2 certificate rotation completed on ${HOSTNAME}\"}"
fi
```

CA rotation is a separate, disruptive operation. Use `rke2 certificate rotate-ca` instead of `rke2 certificate rotate` when rotating the cluster CA.

### Schedule with cron

```bash
# Run the check monthly on each RKE2 server node
0 2 1 * * /usr/local/bin/auto-rotate-rke2-certs.sh >> /var/log/auto-rotate-rke2-certs.log 2>&1
```

In multi-server clusters, stagger the schedules so only one server node rotates at a time.

## Monitoring Certificate Expiry

### Prometheus Alert for Certificate Expiry

```yaml
# Alert 30 days before Rancher certificate expires
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-expiry-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: certificate-expiry
      rules:
        # Alert if any certificate on Rancher ingress expires within 30 days
        - alert: CertificateExpiringSoon
          expr: |
            probe_ssl_earliest_cert_expiry - time() < 30 * 24 * 3600
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Certificate expires in {{ $value | humanizeDuration }}"
            description: "Certificate probe for {{ $labels.instance }} expires soon"

        # Critical: expires within 7 days
        - alert: CertificateCriticalExpiry
          expr: |
            probe_ssl_earliest_cert_expiry - time() < 7 * 24 * 3600
          for: 1h
          labels:
            severity: critical
          annotations:
            summary: "Certificate expires in less than 7 days!"
            description: "Certificate probe for {{ $labels.instance }} is near expiry"
```

## Blackbox Exporter for Certificate Monitoring

```yaml
# Deploy blackbox-exporter for TLS probe
apiVersion: v1
kind: ConfigMap
metadata:
  name: blackbox-config
  namespace: cattle-monitoring-system
data:
  blackbox.yml: |
    modules:
      https_rancher:
        prober: http
        timeout: 10s
        http:
          fail_if_not_ssl: true
          valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
          tls_config:
            insecure_skip_verify: false
          preferred_ip_protocol: ip4
```

## Conclusion

Automating certificate rotation in Rancher prevents the certificate expiry outages that are unfortunately common in Kubernetes environments. Using cert-manager for Rancher's own TLS certificates provides hands-free renewal. RKE2's built-in certificate rotation command simplifies cluster certificate management. Combining Prometheus certificate expiry monitoring with alerting ensures you have advance warning before any certificate expires. Test your certificate rotation procedures in a non-production environment before applying them to production.
