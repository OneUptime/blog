# How to Rotate RKE2 Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Certificate, TLS, Security, Maintenance

Description: Learn how to rotate TLS certificates in RKE2 to maintain security and prevent certificate expiration from causing cluster outages.

Kubernetes uses TLS certificates extensively for secure communication between components. These certificates have expiration dates, and failing to rotate them can cause cluster outages when they expire. RKE2 provides built-in certificate rotation capabilities that simplify this critical maintenance task. This guide covers manual and automatic certificate rotation.

## Prerequisites

- RKE2 cluster running
- Root access to server nodes, and agent nodes if rotating agent certificates
- Understanding of when your certificates expire

## Understanding RKE2 Certificate Locations

RKE2 manages certificates for:
- etcd client, server, and peer certificates
- API server serving/client certificates, cluster CA certificates, and the service account signing key
- kubelet client and serving certificates
- kube-proxy certificates

Server certificate material is stored at: `/var/lib/rancher/rke2/server/tls/`. Agent certificates are stored under `/var/lib/rancher/rke2/agent/`.

## Step 1: Check Certificate Expiration

```bash
# Check expiration of RKE2-managed certificates
sudo rke2 certificate check --output table

sudo find /var/lib/rancher/rke2/server/tls -name "*.crt" \
  -exec sh -c 'echo "=== {} ===" && \
  openssl x509 -in {} -noout -dates 2>/dev/null' \;

# Check specific important certificates
CERTS=(
  "/var/lib/rancher/rke2/server/tls/server-ca.crt"
  "/var/lib/rancher/rke2/server/tls/client-ca.crt"
  "/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt"
)

for cert in "${CERTS[@]}"; do
  if [ -f "$cert" ]; then
    echo "=== $(basename $cert) ==="
    openssl x509 -in "$cert" -noout -dates
    # Check if expiring within 120 days
    openssl x509 -in "$cert" -noout -checkend 10368000 && \
      echo "OK: Not expiring in 120 days" || \
      echo "WARNING: Expiring within 120 days!"
    echo ""
  fi
done

# Check kubelet client certificate expiration
sudo find /var/lib/rancher/rke2/agent -name "*.crt" \
  -exec sh -c 'echo "=== {} ===" && \
  openssl x509 -in {} -noout -enddate 2>/dev/null' \;
```

## Step 2: Automatic Certificate Rotation

RKE2 automatically renews client and server certificates on startup when they are expired or within 120 days of expiring. Kubelet certificate rotation can also be enabled for kubelet client and serving certificates:

```yaml
# /etc/rancher/rke2/config.yaml - Enable kubelet cert rotation
kubelet-arg:
  # Enable automatic rotation of kubelet client certificates
  - "rotate-certificates=true"

  # Enable automatic rotation of kubelet serving certificates
  - "rotate-server-certificates=true"
```

```bash
# Apply the configuration on server nodes
sudo systemctl restart rke2-server

# Apply the configuration on agent-only nodes
sudo systemctl restart rke2-agent

# Verify kubelet certificate rotation is enabled
sudo ps aux | grep kubelet | tr ' ' '\n' | grep rotate
```

## Step 3: Manual Certificate Rotation

For rotating all RKE2 client and server certificates:

```bash
# RKE2 provides a built-in certificate rotation command
# This rotates client/server certificates, but not CA certificates

# First, take an etcd snapshot for backup
sudo rke2 etcd-snapshot save \
  --name pre-cert-rotation-$(date +%Y%m%d-%H%M%S)

# Stop RKE2 before rotating certificates
sudo systemctl stop rke2-server

# Rotate all client and server certificates
sudo rke2 certificate rotate

# Start RKE2 again
sudo systemctl start rke2-server

# For HA clusters, run this sequence on each server node one at a time
```

## Step 4: Rotate Specific Certificates

```bash
# Rotate only specific certificate types with --service
# Available services include admin, api-server, controller-manager, scheduler,
# rke2-controller, rke2-server, cloud-controller, etcd, auth-proxy, kubelet, kube-proxy

# Stop RKE2 before rotating certificates
sudo systemctl stop rke2-server

# Rotate one service certificate
sudo rke2 certificate rotate --service api-server

# Rotate a comma-separated list of service certificates
sudo rke2 certificate rotate --service api-server,kubelet

# Start RKE2 again
sudo systemctl start rke2-server

# Do not delete CA files from /var/lib/rancher/rke2/server/tls.
# Use rke2 certificate rotate-ca with staged certificate files for CA rotation.

# Monitor the certificate generation
sudo journalctl -u rke2-server -f | grep -i cert
```

## Step 5: Update kubeconfig After Rotation

After rotating certificates, kubeconfig files may need updating:

```bash
# After certificate rotation, update your kubeconfig
# The admin client certificate may have changed if you rotated the admin certificate.
# The cluster CA changes only if you perform a CA rotation.

# Back up existing kubeconfig
cp ~/.kube/config ~/.kube/config.backup

# Get the new kubeconfig
sudo cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# If the server address is 127.0.0.1, update to actual IP/hostname
sed -i 's/127.0.0.1/<SERVER_IP>/' ~/.kube/config

# Test the connection
kubectl get nodes

# If nodes are not responding, check the certificate
kubectl get nodes 2>&1 | grep -i "certificate\|tls\|x509"
```

## Step 6: Update Agent Certificates

After rotating server certificates, agent nodes may need a restart. Agent certificates are renewed when the agent starts:

```bash
# On each agent node, check if the agent can still connect
sudo journalctl -u rke2-agent | tail -20 | grep -E "error|Error|certificate"

# If agents show certificate errors, restart them
sudo systemctl restart rke2-agent

# If the CA changed, follow the RKE2 rotate-ca guidance and update any
# secure-token nodes with the new token value before restarting them.

# Verify the agent reconnected
sudo journalctl -u rke2-agent -f | grep -Ei "certificate|registered|ready|error"
```

## Step 7: Monitor Certificate Expiration with Prometheus

```yaml
# prometheus-cert-alert.yaml - Alert before certificate expiration
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubernetes-cert-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: kubernetes-certificates
    rules:
    # Alert 90 days before expiration
    - alert: KubernetesClientCertificateExpiringSoon
      expr: |
        apiserver_client_certificate_expiration_seconds_count{job="apiserver"} > 0
        and on(job) histogram_quantile(0.01, sum by (job, le) (rate(apiserver_client_certificate_expiration_seconds_bucket{job="apiserver"}[5m])))
        < 7776000  # 90 days in seconds
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Kubernetes client certificate expiring within 90 days"
        description: "Client certificate {{ $labels.job }} is expiring in less than 90 days"

    # Alert 30 days before expiration
    - alert: KubernetesClientCertificateExpiringCritical
      expr: |
        apiserver_client_certificate_expiration_seconds_count{job="apiserver"} > 0
        and on(job) histogram_quantile(0.01, sum by (job, le) (rate(apiserver_client_certificate_expiration_seconds_bucket{job="apiserver"}[5m])))
        < 2592000  # 30 days in seconds
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Kubernetes client certificate expiring within 30 days"
```

## Conclusion

Certificate rotation is a critical maintenance task for Kubernetes clusters that is often overlooked until certificates expire and cause cluster outages. RKE2's built-in certificate rotation command simplifies this process significantly. For production clusters, implement Prometheus alerts for certificate expiration and schedule regular certificate rotation as part of your maintenance calendar. Enable automatic kubelet certificate rotation to handle the most common certificate type without manual intervention.
