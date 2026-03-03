# How to Manage PKI and Certificate Lifetimes in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, PKI, Certificate, Lifecycle Management, Security

Description: Complete guide to managing public key infrastructure and certificate lifetimes in Talos Linux including monitoring, renewal strategies, and best practices.

---

Talos Linux relies heavily on certificates for securing all communication channels. The entire management plane, Kubernetes API, etcd cluster, and kubelet communication all use TLS certificates. If any of these certificates expire, the affected components stop working. Managing the PKI lifecycle - from issuance through monitoring to renewal - is one of the most important operational tasks for Talos Linux cluster administrators.

This guide covers the PKI structure in Talos Linux, how to monitor certificate lifetimes, and strategies for keeping everything current.

## The Talos Linux PKI Structure

Talos Linux maintains several separate certificate authorities, each responsible for a different trust domain.

### Talos API CA

This CA signs certificates used for the Talos API (port 50000). It provides the trust anchor for `talosctl` communication with nodes.

- **Server certificates**: Each node has a server certificate for the Talos API
- **Client certificates**: Stored in `~/.talos/config`, used by `talosctl`

### Kubernetes CA

This CA signs certificates for the Kubernetes control plane.

- **API server certificate**: Used by kube-apiserver
- **Kubelet client certificates**: Used by kubelets to authenticate with the API server
- **Controller manager and scheduler certificates**: Used by these components to authenticate

### etcd CA

This CA signs certificates for etcd communication.

- **Peer certificates**: Used for etcd node-to-node communication
- **Client certificates**: Used by the API server to communicate with etcd

### Front Proxy CA

Used for Kubernetes API aggregation layer certificates.

```bash
# View all certificates and their CAs on a control plane node
talosctl -n 10.0.1.10 get certificate

# Check specific certificate details
talosctl -n 10.0.1.10 read /etc/kubernetes/pki/apiserver.crt | \
  openssl x509 -text -noout
```

## Default Certificate Lifetimes

Understanding the default lifetimes helps you plan renewals.

| Certificate | Default Lifetime | Renewed By |
|-------------|-----------------|------------|
| Talos API CA | 10 years | Manual rotation |
| Kubernetes CA | 10 years | Manual rotation |
| etcd CA | 10 years | Manual rotation |
| API server cert | 1 year | Talos auto-renewal |
| Kubelet cert | 1 year | Talos auto-renewal |
| etcd peer cert | 1 year | Talos auto-renewal |
| Front proxy cert | 1 year | Talos auto-renewal |

Talos automatically renews leaf certificates (those signed by the CAs) before they expire. However, the CA certificates themselves must be rotated manually.

## Monitoring Certificate Expiration

### Using talosctl

```bash
# Check all certificates on a node
talosctl -n 10.0.1.10 get certificate -o yaml

# Check the Talos CA expiration
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.machine.ca.crt' | base64 -d | \
  openssl x509 -noout -enddate

# Check the Kubernetes CA expiration
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.cluster.ca.crt' | base64 -d | \
  openssl x509 -noout -enddate

# Check the API server certificate
talosctl -n 10.0.1.10 read /etc/kubernetes/pki/apiserver.crt | \
  openssl x509 -noout -subject -enddate
```

### Automated Monitoring Script

Create a script that checks all certificate lifetimes and alerts when they are approaching expiration.

```bash
#!/bin/bash
# check-all-certs.sh
# Checks all certificate lifetimes across the cluster

WARNING_DAYS=90
CRITICAL_DAYS=30
EXIT_CODE=0

check_cert() {
  local name=$1
  local cert_pem=$2

  if [ -z "$cert_pem" ]; then
    echo "UNKNOWN: $name - could not retrieve certificate"
    return
  fi

  local end_date
  end_date=$(echo "$cert_pem" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

  if [ -z "$end_date" ]; then
    echo "UNKNOWN: $name - could not parse certificate"
    return
  fi

  local end_epoch
  end_epoch=$(date -d "$end_date" +%s 2>/dev/null)
  local now_epoch
  now_epoch=$(date +%s)
  local days_left=$(( (end_epoch - now_epoch) / 86400 ))

  if [ "$days_left" -lt "$CRITICAL_DAYS" ]; then
    echo "CRITICAL: $name expires in $days_left days ($end_date)"
    EXIT_CODE=2
  elif [ "$days_left" -lt "$WARNING_DAYS" ]; then
    echo "WARNING: $name expires in $days_left days ($end_date)"
    [ "$EXIT_CODE" -lt 1 ] && EXIT_CODE=1
  else
    echo "OK: $name expires in $days_left days ($end_date)"
  fi
}

CONTROL_PLANE="10.0.1.10"

echo "=== CA Certificates ==="
# Talos API CA
TALOS_CA=$(talosctl -n $CONTROL_PLANE get machineconfig -o yaml | \
  yq '.machine.ca.crt' | base64 -d 2>/dev/null)
check_cert "Talos API CA" "$TALOS_CA"

# Kubernetes CA
K8S_CA=$(talosctl -n $CONTROL_PLANE get machineconfig -o yaml | \
  yq '.cluster.ca.crt' | base64 -d 2>/dev/null)
check_cert "Kubernetes CA" "$K8S_CA"

echo ""
echo "=== Leaf Certificates ==="
# API Server
APISERVER_CERT=$(talosctl -n $CONTROL_PLANE read /etc/kubernetes/pki/apiserver.crt 2>/dev/null)
check_cert "API Server" "$APISERVER_CERT"

# Kubelet
for node in 10.0.1.10 10.0.1.11 10.0.1.12 10.0.2.10 10.0.2.11; do
  KUBELET_CERT=$(talosctl -n $node read /var/lib/kubelet/pki/kubelet-client-current.pem 2>/dev/null)
  check_cert "Kubelet ($node)" "$KUBELET_CERT"
done

echo ""
echo "Exit code: $EXIT_CODE"
exit $EXIT_CODE
```

### Prometheus Metrics

Export certificate expiration metrics for Prometheus.

```yaml
# Deploy a certificate exporter as a DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cert-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: cert-exporter
  template:
    metadata:
      labels:
        app: cert-exporter
    spec:
      containers:
      - name: cert-exporter
        image: enix/x509-certificate-exporter:latest
        args:
          - --watch-kube-secrets
          - --secret-type=kubernetes.io/tls
        ports:
        - containerPort: 9793
          name: metrics
```

Create Prometheus alerts:

```yaml
# PrometheusRule for certificate expiration alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-expiry-alerts
  namespace: monitoring
spec:
  groups:
  - name: certificate-expiry
    rules:
    - alert: CertificateExpiringSoon
      expr: x509_cert_not_after - time() < 86400 * 30
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Certificate expiring within 30 days"
        description: "Certificate {{ $labels.subject_CN }} expires in {{ $value | humanizeDuration }}"

    - alert: CertificateExpiryCritical
      expr: x509_cert_not_after - time() < 86400 * 7
      for: 1h
      labels:
        severity: critical
      annotations:
        summary: "Certificate expiring within 7 days"
        description: "Certificate {{ $labels.subject_CN }} expires in {{ $value | humanizeDuration }}"
```

## Certificate Renewal Strategies

### Automatic Leaf Certificate Renewal

Talos automatically renews leaf certificates before they expire. This happens during the normal operation of the cluster. You can verify that auto-renewal is working by checking that leaf certificates have recent issuance dates.

```bash
# Check when the API server certificate was last issued
talosctl -n 10.0.1.10 read /etc/kubernetes/pki/apiserver.crt | \
  openssl x509 -noout -startdate -enddate
```

### Planned CA Rotation Schedule

Since CAs are not auto-renewed, establish a rotation schedule:

```text
Year 1: Initial cluster deployment (10-year CA)
Year 3: First rotation drill in staging
Year 5: First production CA rotation (midpoint of CA lifetime)
Year 7: Second CA rotation
Year 9: Third CA rotation (before original CA expires)
```

This gives you two years of buffer before the original CA expires.

### Emergency CA Rotation

If a CA key is compromised, you need to rotate immediately:

```bash
# Emergency rotation steps (abbreviated)
# 1. Generate new CA
# 2. Deploy CA bundle (trust both old and new)
# 3. Deploy final config (trust only new)
# 4. Revoke access from anyone using old credentials

# After rotation, regenerate all client credentials
talosctl -n 10.0.1.10 kubeconfig --force
```

## Best Practices for PKI Management

### Store CA Keys Securely

CA private keys are the most sensitive assets in your cluster. Never store them:

- In plain text on a filesystem
- In a git repository (even private)
- On a shared drive

Instead, use:

```bash
# Store CA keys in a hardware security module (HSM) or
# a secrets management system like HashiCorp Vault

# If using Vault
vault kv put secret/talos/ca \
  key=@talos-ca.key \
  crt=@talos-ca.crt
```

### Use Separate CAs for Different Environments

Do not share CA certificates between production, staging, and development clusters. Each environment should have its own PKI.

```bash
# Production cluster
talosctl gen secrets --output-file prod-secrets.yaml

# Staging cluster - completely separate PKI
talosctl gen secrets --output-file staging-secrets.yaml
```

### Document Your PKI

Maintain a document that tracks:

- All CA certificates, their fingerprints, and expiration dates
- Who has access to CA private keys
- When the last rotation occurred
- When the next rotation is scheduled

```bash
# Generate a PKI inventory
echo "PKI Inventory - $(date)"
echo "========================"
echo ""
echo "Talos API CA:"
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.machine.ca.crt' | base64 -d | \
  openssl x509 -noout -fingerprint -dates -subject
echo ""
echo "Kubernetes CA:"
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.cluster.ca.crt' | base64 -d | \
  openssl x509 -noout -fingerprint -dates -subject
```

### Test Rotation in Staging First

Never perform a CA rotation in production for the first time. Always test the exact procedure in a staging environment that mirrors your production setup.

## Handling Certificate-Related Failures

If a certificate expires and components stop communicating:

```bash
# If kubelet cannot connect to API server
talosctl -n 10.0.2.10 logs kubelet | grep -i "certificate"

# If etcd has certificate issues
talosctl -n 10.0.1.10 logs etcd | grep -i "tls\|certificate"

# Force certificate regeneration by applying the config
talosctl -n 10.0.1.10 apply-config --file controlplane-config.yaml
# This triggers Talos to regenerate leaf certificates
```

## Conclusion

PKI management in Talos Linux requires attention to both the automatically renewed leaf certificates and the manually managed CA certificates. Set up monitoring to track expiration dates, establish a rotation schedule for CAs, store private keys securely, and practice rotation in non-production environments. The certificate infrastructure is the trust foundation of your entire cluster - investing time in proper management prevents the most disruptive failures.
