# How to Set Up Automatic Certificate Rotation for kubelet Client Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Certificates

Description: Learn how to configure automatic certificate rotation for kubelet client certificates to maintain secure cluster communication without manual intervention, preventing authentication failures from expired certificates.

---

Kubelet client certificates authenticate kubelets to the API server. By default, these certificates expire after one year, requiring manual renewal to prevent cluster failures. Kubernetes provides automatic certificate rotation to renew certificates before expiration, maintaining secure communication without operational overhead.

This guide demonstrates how to enable and configure automatic certificate rotation for kubelet client certificates.

## Understanding kubelet Certificates

The kubelet uses two types of certificates:

1. **Client certificate**: Authenticates kubelet to API server (rotates automatically)
2. **Server certificate**: Authenticates API connections to kubelet (manual rotation)

Client certificate workflow:
- kubelet requests certificate from API server
- Certificate Signing Request (CSR) created
- Approved automatically or manually
- kubelet receives signed certificate
- Rotation happens before expiration

## Enabling Certificate Rotation

Configure kubelet for automatic rotation:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
rotateCertificates: true
serverTLSBootstrap: false
```

The `rotateCertificates` flag enables automatic client certificate rotation.

## Configuring via kubeadm

Enable rotation during cluster initialization:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
rotateCertificates: true
```

Initialize cluster:

```bash
sudo kubeadm init --config kubeadm-config.yaml
```

For existing clusters:

```bash
# Edit kubelet config
sudo vim /var/lib/kubelet/config.yaml
# Add: rotateCertificates: true

# Restart kubelet
sudo systemctl restart kubelet
```

## Enabling Certificate Approval

The API server must approve certificate requests. Enable automatic approval:

```yaml
# Enable auto-approval in API server
# /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --enable-bootstrap-token-auth=true
    # ... other flags
```

Deploy certificate approver controller:

```bash
# Check if auto-approver is running
kubectl get pods -n kube-system | grep certificate

# The controller manager handles approval by default
kubectl get pods -n kube-system -l component=kube-controller-manager
```

## Verifying Automatic Rotation is Enabled

Check kubelet configuration:

```bash
# View current kubelet config
cat /var/lib/kubelet/config.yaml | grep rotateCertificates

# Check kubelet process
ps aux | grep kubelet | grep rotate-certificates

# View kubelet logs
sudo journalctl -u kubelet | grep certificate
```

Check certificate details:

```bash
# View current certificate
sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -text -noout

# Check expiration date
sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -noout -dates

# Output shows:
# notBefore=Jan  1 00:00:00 2026 GMT
# notAfter=Jan  1 00:00:00 2027 GMT
```

## Monitoring Certificate Requests

Track CSRs in the cluster:

```bash
# List all certificate signing requests
kubectl get csr

# Filter for kubelet client certificates
kubectl get csr | grep kubelet-client

# View details of a specific CSR
kubectl describe csr <csr-name>

# Watch for new CSRs
kubectl get csr --watch
```

CSR approval states:
- **Pending**: Awaiting approval
- **Approved**: Approved and certificate issued
- **Denied**: Rejected

## Manual CSR Approval

If automatic approval isn't configured, approve manually:

```bash
# List pending CSRs
kubectl get csr | grep Pending

# Approve a CSR
kubectl certificate approve <csr-name>

# Example: Approve kubelet client certificate
kubectl certificate approve node-csr-abc123

# Deny a CSR if needed
kubectl certificate deny <csr-name>
```

Approve all pending kubelet CSRs:

```bash
# Approve all pending node CSRs
kubectl get csr | grep Pending | awk '{print $1}' | xargs kubectl certificate approve
```

## Setting Up Automatic Approval

Create a ClusterRoleBinding for automatic approval:

```yaml
# auto-approve-kubelet-csr.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: auto-approve-csrs-for-group
subjects:
- kind: Group
  name: system:nodes
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: system:certificates.k8s.io:certificatesigningrequests:nodeclient
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: auto-approve-renewals-for-nodes
subjects:
- kind: Group
  name: system:nodes
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: system:certificates.k8s.io:certificatesigningrequests:selfnodeclient
  apiGroup: rbac.authorization.k8s.io
```

Apply:

```bash
kubectl apply -f auto-approve-kubelet-csr.yaml
```

## Monitoring Certificate Expiration

Track certificate expiration dates:

```bash
# Check certificate expiration on all nodes
for node in $(kubectl get nodes -o name | cut -d'/' -f2); do
  echo "=== $node ==="
  ssh $node "sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -noout -dates"
done

# Create a monitoring script
cat > check-cert-expiry.sh <<'EOF'
#!/bin/bash
WARN_DAYS=30

for node in $(kubectl get nodes -o name | cut -d'/' -f2); do
  CERT_FILE="/var/lib/kubelet/pki/kubelet-client-current.pem"
  EXPIRY=$(ssh $node "sudo openssl x509 -in $CERT_FILE -noout -enddate | cut -d= -f2")
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

  if [ $DAYS_LEFT -lt $WARN_DAYS ]; then
    echo "WARNING: $node certificate expires in $DAYS_LEFT days"
  else
    echo "OK: $node certificate expires in $DAYS_LEFT days"
  fi
done
EOF

chmod +x check-cert-expiry.sh
./check-cert-expiry.sh
```

## Setting Up Prometheus Alerts

Monitor certificate expiration with Prometheus:

```yaml
# certificate-expiry-alerts.yaml
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
      - alert: KubeletCertificateExpiringSoon
        expr: |
          (kubelet_certificate_manager_client_expiration_seconds - time()) / 86400 < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "kubelet certificate expiring soon"
          description: "kubelet client certificate on node {{ $labels.node }} expires in {{ $value | humanizeDuration }}"

      - alert: KubeletCertificateExpiringCritical
        expr: |
          (kubelet_certificate_manager_client_expiration_seconds - time()) / 86400 < 7
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "kubelet certificate expiring very soon"
          description: "kubelet client certificate on node {{ $labels.node }} expires in {{ $value | humanizeDuration }}"
```

Query metrics:

```promql
# Days until certificate expiration
(kubelet_certificate_manager_client_expiration_seconds - time()) / 86400

# Certificates expiring within 30 days
(kubelet_certificate_manager_client_expiration_seconds - time()) / 86400 < 30
```

## Testing Certificate Rotation

Force certificate rotation for testing:

```bash
# Backup current certificate
sudo cp /var/lib/kubelet/pki/kubelet-client-current.pem /tmp/kubelet-client-backup.pem

# Delete current certificate to force rotation
sudo rm /var/lib/kubelet/pki/kubelet-client-current.pem

# Restart kubelet to trigger rotation
sudo systemctl restart kubelet

# Watch for new CSR
kubectl get csr --watch

# Approve if needed
kubectl certificate approve <new-csr-name>

# Verify new certificate was issued
sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -text -noout
```

## Troubleshooting Certificate Rotation

Common issues and solutions:

**Issue: CSRs not being approved**

```bash
# Check for pending CSRs
kubectl get csr | grep Pending

# Check controller manager logs
kubectl logs -n kube-system -l component=kube-controller-manager | grep csr

# Manually approve
kubectl certificate approve <csr-name>

# Verify RBAC permissions
kubectl get clusterrolebinding | grep csr
```

**Issue: kubelet cannot connect to API server**

```bash
# Check kubelet logs
sudo journalctl -u kubelet -n 100 | grep -i certificate

# Verify certificate exists
ls -la /var/lib/kubelet/pki/

# Check kubeconfig
cat /etc/kubernetes/kubelet.conf

# Restart kubelet
sudo systemctl restart kubelet
```

**Issue: Certificate rotation not happening**

```bash
# Verify rotation is enabled
cat /var/lib/kubelet/config.yaml | grep rotateCertificates

# Check kubelet version (rotation requires 1.8.0+)
kubelet --version

# Review kubelet logs for rotation attempts
sudo journalctl -u kubelet | grep -i rotate
```

## Certificate Rotation Timeline

Rotation occurs at 80% of certificate lifetime:

```
Certificate lifetime: 1 year (8760 hours)
Rotation trigger: 80% = 7008 hours = 292 days
Days before expiry: 73 days
```

Custom certificate duration (requires API server configuration):

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --cluster-signing-duration=17520h  # 2 years
```

## Best Practices

1. **Always enable rotation**: Set `rotateCertificates: true` on all nodes

2. **Monitor expiration**: Alert 30 days before expiration

3. **Automate approval**: Configure automatic CSR approval for production

4. **Test rotation**: Periodically test certificate rotation process

5. **Backup certificates**: Keep backups of current certificates

6. **Document procedures**: Maintain runbooks for certificate issues

7. **Use kubeadm**: Leverage kubeadm's built-in certificate management

Example production configuration:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Enable automatic client certificate rotation
rotateCertificates: true
# Server certificate rotation (requires manual approval)
serverTLSBootstrap: false
# Authentication
authentication:
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
  webhook:
    enabled: true
    cacheTTL: 2m
  anonymous:
    enabled: false
```

Automatic certificate rotation for kubelet client certificates eliminates manual renewal operations and prevents cluster authentication failures from expired certificates. Enable rotation on all nodes, configure automatic CSR approval, monitor certificate expiration dates, and test the rotation process regularly to ensure your cluster maintains secure, uninterrupted communication.
