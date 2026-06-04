# How to Troubleshoot NodeNotReady Status Caused by Kubelet Certificate Expiration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Certificate, Node Management

Description: Learn how to diagnose and fix NodeNotReady status caused by expired kubelet certificates, including certificate renewal procedures and automation strategies to prevent future expiration.

---

NodeNotReady is a critical Kubernetes issue that takes nodes out of service, preventing pod scheduling and potentially triggering cascading failures. One common but often overlooked cause is kubelet certificate expiration. When the certificate kubelet uses to authenticate with the API server expires, the node loses connectivity and enters NotReady state.

This guide covers detecting certificate expiration, manually renewing certificates, implementing automatic rotation, and preventing certificate-related node failures in production clusters.

## Understanding Kubelet Certificate Authentication

Kubelets authenticate to the API server using client certificates. These certificates typically have one-year expiration periods. As expiration approaches, kubelet should automatically renew them through certificate signing requests to the API server.

However, several scenarios cause renewal to fail. Cluster upgrades, changes to certificate configuration, or problems with the certificate signing controller can prevent automatic renewal. When certificates expire without renewal, kubelet can no longer authenticate, and the node transitions to NotReady status.

Unlike other NodeNotReady causes like network issues or resource exhaustion, certificate expiration is time-based and predictable. Monitoring certificate validity periods allows proactive renewal before expiration causes outages.

## Identifying Certificate Expiration as the Cause

When a node shows NotReady status, check the node condition messages first.

```bash
# List nodes and their status

kubectl get nodes

# Output shows:
# NAME       STATUS      ROLES           AGE   VERSION
# master-1   Ready       control-plane   90d   v1.28.0
# worker-1   NotReady    <none>          90d   v1.28.0
# worker-2   Ready       <none>          90d   v1.28.0

# Get detailed node information
kubectl describe node worker-1 | grep -A 20 Conditions
```

Look for error messages related to certificate validation in node conditions or events.

```bash
# Check kubelet logs on the affected node
ssh worker-1
sudo journalctl -u kubelet -n 100 --no-pager | grep -i cert

# Common error messages:
# certificate has expired or is not yet valid
# x509: certificate has expired
# Unable to authenticate the request due to an error
```

Check the kubelet certificate expiration date directly.

```bash
# View kubelet client certificate
ssh worker-1
sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem \
  -noout -dates

# Output:
# notBefore=Jan  1 00:00:00 2025 GMT
# notAfter=Jan  1 00:00:00 2026 GMT

# Check if expired
sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem \
  -noout -checkend 0

# Exit code 0 = valid, exit code 1 = expired
```

## Checking Certificate Status Across All Nodes

Audit certificate expiration dates across your entire cluster to identify nodes at risk.

```bash
# Create a script to check all nodes
cat > check-certs.sh <<'EOF'
#!/bin/bash
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  echo "Checking $node..."
  ssh $node "
    if [ -f /var/lib/kubelet/pki/kubelet-client-current.pem ]; then
      echo -n '$node: '
      sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem \
        -noout -enddate | cut -d= -f2
      days=\$(sudo openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem \
        -noout -checkend 604800 && echo 'OK' || echo 'EXPIRES SOON')
      echo \"  Status: \$days\"
    else
      echo '$node: Certificate file not found'
    fi
  "
done
EOF

chmod +x check-certs.sh
./check-certs.sh

# Output:
# Checking master-1...
# master-1: Jan 15 12:34:56 2026 GMT
#   Status: OK
# Checking worker-1...
# worker-1: Feb 5 08:22:10 2026 GMT
#   Status: EXPIRES SOON
```

## Manually Renewing Kubelet Certificates

When certificates have expired or will expire soon in a kubeadm cluster, recreate the kubelet client kubeconfig and then let kubelet resume rotation.

```bash
# SSH to the affected node
ssh worker-1

# Stop kubelet
sudo systemctl stop kubelet

# Backup existing certificates
sudo cp -r /var/lib/kubelet/pki /var/lib/kubelet/pki.backup
sudo cp /etc/kubernetes/kubelet.conf /etc/kubernetes/kubelet.conf.backup

# Remove the expired kubelet client configuration and certificates
sudo rm /etc/kubernetes/kubelet.conf
sudo rm /var/lib/kubelet/pki/kubelet-client*
```

On a working control plane node with access to the Kubernetes CA key, generate a replacement kubelet kubeconfig for the existing node name.

```bash
# Run on a working control plane node
export NODE=worker-1
sudo kubeadm kubeconfig user \
  --org system:nodes \
  --client-name system:node:${NODE} \
  > kubelet.conf

# Copy kubelet.conf to /etc/kubernetes/kubelet.conf on the affected node
scp kubelet.conf worker-1:/tmp/kubelet.conf
ssh worker-1
sudo mv /tmp/kubelet.conf /etc/kubernetes/kubelet.conf
sudo chown root:root /etc/kubernetes/kubelet.conf

# Start kubelet (it will generate new certificate request)
sudo systemctl start kubelet

# Wait for the rotated kubelet client certificate to be recreated
sudo ls -l /var/lib/kubelet/pki/kubelet-client-current.pem
```

After the rotated client certificate exists, update `/etc/kubernetes/kubelet.conf` on the affected node so future rotation uses the current symlink instead of embedded certificate data.

```yaml
client-certificate: /var/lib/kubelet/pki/kubelet-client-current.pem
client-key: /var/lib/kubelet/pki/kubelet-client-current.pem
```

Restart kubelet again.

```bash
sudo systemctl restart kubelet
```

If your cluster is configured for TLS bootstrap and the kubelet generates a pending CSR instead, approve the kubelet client CSR when it is not automatically approved.

```bash
# List pending CSRs
kubectl get csr

# Output:
# NAME                           AGE   SIGNERNAME                                    REQUESTOR                 CONDITION
# csr-worker-1-xyz123            10s   kubernetes.io/kube-apiserver-client-kubelet   system:node:worker-1      Pending

# Approve the CSR
kubectl certificate approve csr-worker-1-xyz123

# Verify approval
kubectl get csr csr-worker-1-xyz123

# Output should show Approved,Issued
```

Check that the node returns to Ready status.

```bash
# Watch node status
kubectl get nodes -w

# Should transition from NotReady to Ready within 1-2 minutes
```

## Enabling Automatic Certificate Rotation

Configure kubelet to automatically rotate certificates before expiration. This prevents manual intervention and reduces the risk of certificate-related outages.

Edit the kubelet configuration file on each node at `/var/lib/kubelet/config.yaml`.

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Enable certificate rotation
rotateCertificates: true
# Optional: request signed kubelet serving certificates instead of self-signed serving certificates
serverTLSBootstrap: true
```

For kubeadm clusters, add these settings to the kubeadm configuration and apply to all nodes.

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
rotateCertificates: true
serverTLSBootstrap: true
```

Restart kubelet on all nodes to apply the configuration.

```bash
# Restart kubelet
sudo systemctl restart kubelet

# Verify rotation is enabled
sudo cat /var/lib/kubelet/config.yaml | grep -i rotate
```

## Configuring Controller Manager for Auto-Approval

The certificate signing requests generated by kubelet need approval. The built-in CSR approving controller is enabled by default in kube-controller-manager, but it only approves kubelet client CSRs when RBAC allows the request.

Create or verify the ClusterRoleBindings that allow bootstrap and renewal approval.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: auto-approve-csrs-for-bootstrap
subjects:
- kind: Group
  name: system:bootstrappers
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

The controller manager can automatically approve kubelet client certificate renewal requests from authorized nodes, enabling fully automated client certificate rotation. Kubelet serving certificate CSRs use the `kubernetes.io/kubelet-serving` signer and are not automatically approved by the core Kubernetes approver; approve them manually or run a custom approver that validates the requested node DNS names and IP addresses.

## Installing cert-manager for Certificate Management

cert-manager is useful for workload and ingress certificates, but it is not the normal mechanism for kubelet client certificate rotation. Kubelet client certificates are requested through the Kubernetes CSR API and written to the kubelet certificate directory on each node.

Use cert-manager for application certificates that are consumed from Kubernetes Secrets.

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager
```

Configure application certificates to be managed by cert-manager.

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-cert
  namespace: default
spec:
  secretName: app-cert-secret
  duration: 8760h  # 1 year
  renewBefore: 720h  # Renew 30 days before expiration
  dnsNames:
  - app.example.com
  usages:
  - digital signature
  - key encipherment
  - server auth
  issuerRef:
    name: app-issuer
    kind: ClusterIssuer
```

## Monitoring Certificate Expiration

Implement monitoring to alert before certificates expire. Use Prometheus and Alertmanager for automated alerts.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: certificate_expiration
      rules:
      - alert: KubeletCertificateExpiringSoon
        expr: |
          kubelet_certificate_manager_client_ttl_seconds < 604800
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Kubelet certificate expiring soon on {{ $labels.instance }}"
          description: "Certificate expires in less than 7 days"

      - alert: KubeletCertificateExpired
        expr: |
          kubelet_certificate_manager_client_ttl_seconds < 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Kubelet certificate expired on {{ $labels.instance }}"
          description: "Certificate has expired, node may become NotReady"
```

Create a DaemonSet that exports certificate expiration metrics.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cert-exporter
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: cert-exporter
  template:
    metadata:
      labels:
        app: cert-exporter
    spec:
      hostNetwork: true
      containers:
      - name: exporter
        image: joe-elliott/cert-exporter:latest
        args:
        - --include-cert-glob=/var/lib/kubelet/pki/*.pem
        - --include-kubeconfig-glob=/etc/kubernetes/*.conf
        ports:
        - containerPort: 8080
          name: metrics
        volumeMounts:
        - name: kubelet-pki
          mountPath: /var/lib/kubelet/pki
          readOnly: true
        - name: kubernetes
          mountPath: /etc/kubernetes
          readOnly: true
      volumes:
      - name: kubelet-pki
        hostPath:
          path: /var/lib/kubelet/pki
      - name: kubernetes
        hostPath:
          path: /etc/kubernetes
```

## Creating Automated Certificate Audit Jobs

For clusters without automatic rotation, create a host-level audit job that checks certificates proactively and alerts before manual repair is needed. In-cluster CronJobs cannot safely renew kubelet client certificates by themselves because the certificate and kubeconfig files live on each node's host filesystem.

```bash
# /usr/local/bin/check-kubelet-client-cert.sh
#!/bin/bash
set -euo pipefail

cert=/var/lib/kubelet/pki/kubelet-client-current.pem

if [ ! -f "$cert" ]; then
  echo "Kubelet client certificate not found: $cert"
  exit 2
fi

if ! openssl x509 -in "$cert" -noout -checkend 2592000; then
  echo "Kubelet client certificate expires within 30 days"
  openssl x509 -in "$cert" -noout -enddate
  exit 1
fi

echo "Kubelet client certificate is valid for at least 30 days"
```

Kubelet certificate expiration causes preventable node failures. By implementing automatic certificate rotation, monitoring expiration dates, and creating automated audit processes, you eliminate this failure mode. Combined with proper alerting and regular audits, these practices ensure your Kubernetes nodes maintain connectivity to the control plane without manual certificate management intervention.
