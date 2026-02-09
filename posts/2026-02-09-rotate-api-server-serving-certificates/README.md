# How to Rotate Kubernetes API Server Serving Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Certificates

Description: Learn how to safely rotate Kubernetes API server serving certificates before expiration, including certificate generation, validation, and zero-downtime rotation procedures for production clusters.

---

The API server serving certificate secures HTTPS connections between clients and the API server. This certificate expires after one year by default and must be rotated manually to prevent cluster access failures. Understanding how to generate, validate, and rotate API server certificates safely is critical for maintaining cluster availability.

This guide walks through the complete process of rotating API server serving certificates with minimal downtime.

## Understanding API Server Certificates

The API server uses several certificates:

- **Serving certificate** (`apiserver.crt`): Presented to HTTPS clients
- **Client certificate** (`apiserver-kubelet-client.crt`): Authenticates to kubelet
- **etcd client certificate** (`apiserver-etcd-client.crt`): Authenticates to etcd
- **ServiceAccount signing key** (`sa.key`): Signs service account tokens

This guide focuses on rotating the serving certificate.

## Checking Certificate Expiration

View current certificate expiration:

```bash
# On control plane node
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -dates

# Output:
# notBefore=Jan  1 00:00:00 2026 GMT
# notAfter=Jan  1 00:00:00 2027 GMT

# Check all API server certificates
for cert in /etc/kubernetes/pki/*.crt; do
  echo "=== $cert ==="
  sudo openssl x509 -in $cert -noout -subject -dates
  echo
done

# Calculate days until expiration
EXPIRY=$(sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -enddate | cut -d= -f2)
DAYS=$(( ($(date -d "$EXPIRY" +%s) - $(date +%s)) / 86400 ))
echo "API server certificate expires in $DAYS days"
```

## Using kubeadm to Renew Certificates

kubeadm provides built-in certificate renewal:

```bash
# Check which certificates will expire
sudo kubeadm certs check-expiration

# Output shows all certificates and expiration dates:
# CERTIFICATE                EXPIRES                  RESIDUAL TIME   CERTIFICATE AUTHORITY
# admin.conf                 Jan 01, 2027 00:00 UTC   364d           ca
# apiserver                  Jan 01, 2027 00:00 UTC   364d           ca
# apiserver-etcd-client      Jan 01, 2027 00:00 UTC   364d           etcd-ca
# apiserver-kubelet-client   Jan 01, 2027 00:00 UTC   364d           ca

# Renew all certificates
sudo kubeadm certs renew all

# Or renew specific certificate
sudo kubeadm certs renew apiserver
```

After renewal:

```bash
# Restart API server (required for new cert to take effect)
# The API server is a static pod, so moving/touching the manifest triggers restart
sudo touch /etc/kubernetes/manifests/kube-apiserver.yaml

# Wait for API server to restart
kubectl get pods -n kube-system -w

# Verify new certificate
sudo kubeadm certs check-expiration
```

## Manual Certificate Generation

For clusters not using kubeadm or custom SANs:

```bash
# Backup existing certificates
sudo mkdir -p /etc/kubernetes/pki/backup
sudo cp -r /etc/kubernetes/pki/*.crt /etc/kubernetes/pki/*.key /etc/kubernetes/pki/backup/

# Create certificate configuration
cat > apiserver-cert-config.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = kube-apiserver
O = kubernetes

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = kubernetes
DNS.2 = kubernetes.default
DNS.3 = kubernetes.default.svc
DNS.4 = kubernetes.default.svc.cluster.local
DNS.5 = api.example.com
DNS.6 = control-plane-1
DNS.7 = control-plane-2
DNS.8 = control-plane-3
IP.1 = 10.96.0.1
IP.2 = 10.0.0.10
IP.3 = 10.0.0.11
IP.4 = 10.0.0.12
IP.5 = 1.2.3.4
EOF

# Generate new private key
sudo openssl genrsa -out /etc/kubernetes/pki/apiserver-new.key 2048

# Generate certificate signing request
sudo openssl req -new \
  -key /etc/kubernetes/pki/apiserver-new.key \
  -out /etc/kubernetes/pki/apiserver-new.csr \
  -config apiserver-cert-config.cnf

# Sign with CA
sudo openssl x509 -req \
  -in /etc/kubernetes/pki/apiserver-new.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out /etc/kubernetes/pki/apiserver-new.crt \
  -days 365 \
  -extensions v3_req \
  -extfile apiserver-cert-config.cnf

# Verify new certificate
sudo openssl x509 -in /etc/kubernetes/pki/apiserver-new.crt -text -noout
```

## Adding Subject Alternative Names (SANs)

Add additional SANs to certificate:

```bash
# View current SANs
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A 10 "Subject Alternative Name"

# Add new SANs using kubeadm
# Create patch file
cat > kubeadm-config-patch.yaml <<EOF
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
apiServer:
  certSANs:
  - "kubernetes"
  - "kubernetes.default"
  - "kubernetes.default.svc"
  - "kubernetes.default.svc.cluster.local"
  - "api.example.com"
  - "new-api.example.com"  # New SAN
  - "10.96.0.1"
  - "10.0.0.10"
  - "192.168.1.100"  # New IP
EOF

# Generate new certificate with additional SANs
sudo kubeadm init phase certs apiserver --config kubeadm-config-patch.yaml
```

## Zero-Downtime Rotation in HA Clusters

For multi-master HA clusters:

```bash
# Rotate certificates one control plane at a time

# On control-plane-1:
sudo kubeadm certs renew apiserver
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/
sleep 30
sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/

# Wait for API server to become healthy
kubectl get nodes

# Repeat for control-plane-2 and control-plane-3
```

## Automating Certificate Renewal

Create a systemd timer for automatic renewal:

```bash
# Create renewal script
cat > /usr/local/bin/renew-k8s-certs.sh <<'EOF'
#!/bin/bash
set -e

LOG_FILE="/var/log/k8s-cert-renewal.log"
DAYS_BEFORE_EXPIRY=30

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Check if renewal is needed
EXPIRY=$(openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -enddate | cut -d= -f2)
DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s) - $(date +%s)) / 86400 ))

if [ $DAYS_LEFT -gt $DAYS_BEFORE_EXPIRY ]; then
  log "Certificates valid for $DAYS_LEFT more days, no renewal needed"
  exit 0
fi

log "Renewing certificates ($DAYS_LEFT days remaining)"

# Renew certificates
kubeadm certs renew all 2>&1 | tee -a $LOG_FILE

# Restart API server
touch /etc/kubernetes/manifests/kube-apiserver.yaml

log "Certificate renewal complete"
EOF

chmod +x /usr/local/bin/renew-k8s-certs.sh

# Create systemd service
cat > /etc/systemd/system/k8s-cert-renewal.service <<EOF
[Unit]
Description=Kubernetes Certificate Renewal
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/renew-k8s-certs.sh
EOF

# Create systemd timer
cat > /etc/systemd/system/k8s-cert-renewal.timer <<EOF
[Unit]
Description=Kubernetes Certificate Renewal Timer

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable k8s-cert-renewal.timer
sudo systemctl start k8s-cert-renewal.timer

# Check timer status
sudo systemctl list-timers k8s-cert-renewal.timer
```

## Updating Client Configurations

After rotating certificates, update kubeconfig files:

```bash
# Update admin.conf
sudo kubeadm certs renew admin.conf

# Copy new config
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Verify connection
kubectl get nodes

# For other users/applications, distribute updated kubeconfig
sudo kubeadm kubeconfig user --client-name=myuser > /tmp/myuser.kubeconfig
```

## Monitoring Certificate Expiration

Set up monitoring for certificate expiration:

```yaml
# cert-expiry-monitor.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-cert-alerts
  namespace: monitoring
data:
  alerts.yml: |
    groups:
    - name: certificate_expiry
      rules:
      - alert: APIServerCertExpiringSoon
        expr: |
          (apiserver_client_certificate_expiration_seconds - time()) / 86400 < 30
        for: 24h
        labels:
          severity: warning
        annotations:
          summary: "API server certificate expiring soon"
          description: "API server certificate expires in {{ $value | humanizeDuration }}"

      - alert: APIServerCertExpiringCritical
        expr: |
          (apiserver_client_certificate_expiration_seconds - time()) / 86400 < 7
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "API server certificate expiring very soon"
          description: "API server certificate expires in {{ $value | humanizeDuration }}"
```

Create a monitoring script:

```bash
# check-api-cert-expiry.sh
#!/bin/bash

WARN_DAYS=30
CRIT_DAYS=7

for node in $(kubectl get nodes -l node-role.kubernetes.io/control-plane -o name | cut -d'/' -f2); do
  EXPIRY=$(ssh $node "sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -enddate" | cut -d= -f2)
  DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s) - $(date +%s)) / 86400 ))

  if [ $DAYS_LEFT -lt $CRIT_DAYS ]; then
    echo "CRITICAL: $node API server cert expires in $DAYS_LEFT days"
  elif [ $DAYS_LEFT -lt $WARN_DAYS ]; then
    echo "WARNING: $node API server cert expires in $DAYS_LEFT days"
  else
    echo "OK: $node API server cert expires in $DAYS_LEFT days"
  fi
done
```

## Troubleshooting Certificate Issues

Common issues after rotation:

**Issue: kubectl cannot connect**

```bash
# Verify certificate
sudo openssl verify -CAfile /etc/kubernetes/pki/ca.crt /etc/kubernetes/pki/apiserver.crt

# Check API server logs
sudo journalctl -u kubelet | grep apiserver

# Update kubeconfig
sudo cp /etc/kubernetes/admin.conf ~/.kube/config
```

**Issue: Certificate name mismatch**

```bash
# Verify SANs include all access points
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A 10 "Subject Alternative Name"

# Regenerate with correct SANs
sudo kubeadm init phase certs apiserver --config kubeadm-config.yaml
```

**Issue: Old certificate still in use**

```bash
# Force API server restart
sudo crictl ps | grep apiserver
sudo crictl stop <container-id>

# Or delete pod manifest temporarily
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/
sleep 10
sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/
```

## Best Practices

1. **Plan ahead**: Renew certificates 30-60 days before expiration

2. **Test in staging**: Validate rotation procedure in non-production first

3. **Backup certificates**: Always backup before rotation

4. **Document SANs**: Maintain a list of required SANs

5. **Automate monitoring**: Alert on upcoming expiration

6. **Use kubeadm**: Leverage built-in tooling when possible

7. **Coordinate downtime**: For single-master clusters, schedule maintenance window

Complete renewal procedure:

```bash
# 1. Check expiration
sudo kubeadm certs check-expiration

# 2. Backup certificates
sudo cp -r /etc/kubernetes/pki /etc/kubernetes/pki.backup

# 3. Renew certificates
sudo kubeadm certs renew all

# 4. Restart API server
sudo touch /etc/kubernetes/manifests/kube-apiserver.yaml

# 5. Update kubeconfig
sudo cp /etc/kubernetes/admin.conf ~/.kube/config

# 6. Verify
kubectl get nodes
sudo kubeadm certs check-expiration
```

API server certificate rotation is a critical maintenance task that must be performed before certificate expiration to maintain cluster access. Use kubeadm for simplified rotation, monitor expiration dates proactively, automate renewal where possible, and always test rotation procedures in non-production environments before applying to production clusters.
