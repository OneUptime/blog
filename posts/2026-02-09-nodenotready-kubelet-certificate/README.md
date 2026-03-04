# How to Troubleshoot NodeNotReady Status Caused by Kubelet Certificate Expiration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Certificates, Node Management

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

When certificates have expired or will expire soon, manually renew them to restore node functionality.

```bash
# SSH to the affected node
ssh worker-1

# Stop kubelet
sudo systemctl stop kubelet

# Backup existing certificates
sudo cp -r /var/lib/kubelet/pki /var/lib/kubelet/pki.backup
sudo cp /etc/kubernetes/kubelet.conf /etc/kubernetes/kubelet.conf.backup

# Remove expired certificates
sudo rm /var/lib/kubelet/pki/kubelet-client-current.pem
sudo rm /var/lib/kubelet/pki/kubelet-client-*.pem

# Start kubelet (it will generate new certificate request)
sudo systemctl start kubelet

# Check kubelet logs for CSR generation
sudo journalctl -u kubelet -f | grep -i csr
```

On the control plane, approve the pending certificate signing request.

```bash
# List pending CSRs
kubectl get csr

# Output:
# NAME                           AGE   SIGNERNAME                            REQUESTOR                 CONDITION
# csr-worker-1-xyz123            10s   kubernetes.io/kubelet-serving         system:node:worker-1      Pending

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
# Rotate certificates automatically when they have less than this much time remaining
serverTLSBootstrap: true
```

For kubeadm clusters, add these settings to the kubeadm configuration and apply to all nodes.

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
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

The certificate signing requests generated by kubelet need approval. Configure the controller manager to automatically approve certificate renewal requests.

Edit the controller manager configuration on control plane nodes.

```yaml
# /etc/kubernetes/manifests/kube-controller-manager.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-controller-manager
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-controller-manager
    - --cluster-signing-cert-file=/etc/kubernetes/pki/ca.crt
    - --cluster-signing-key-file=/etc/kubernetes/pki/ca.key
    - --cluster-signing-duration=8760h  # 1 year
    # Enable certificate approval controller
    - --controllers=*,certificatesigningrequests-approving,certificatesigningrequests-signing
    image: registry.k8s.io/kube-controller-manager:v1.28.0
    name: kube-controller-manager
```

The controller manager automatically approves certificate renewal requests from kubelets, enabling fully automated certificate rotation.

## Installing cert-manager for Certificate Management

For more sophisticated certificate management, deploy cert-manager to handle certificate lifecycle automatically.

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager

# Create a ClusterIssuer for kubelet certificates
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: kubelet-issuer
spec:
  ca:
    secretName: kubernetes-ca
EOF
```

Configure kubelet certificates to be managed by cert-manager.

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: kubelet-cert
  namespace: kube-system
spec:
  secretName: kubelet-cert-secret
  duration: 8760h  # 1 year
  renewBefore: 720h  # Renew 30 days before expiration
  commonName: system:node:worker-1
  usages:
  - digital signature
  - key encipherment
  - client auth
  issuerRef:
    name: kubelet-issuer
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
          kubelet_certificate_manager_client_expiration_seconds < 604800
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Kubelet certificate expiring soon on {{ $labels.node }}"
          description: "Certificate expires in less than 7 days"

      - alert: KubeletCertificateExpired
        expr: |
          kubelet_certificate_manager_client_expiration_seconds < 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Kubelet certificate expired on {{ $labels.node }}"
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

## Creating Automated Certificate Renewal Jobs

For clusters without automatic rotation, create a CronJob that checks and renews certificates proactively.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kubelet-cert-renewal
  namespace: kube-system
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          hostPID: true
          containers:
          - name: cert-renewer
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Check certificate expiration
              for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
                echo "Checking $node..."
                # Trigger renewal if expiring in 30 days
                # Add renewal logic here
              done
          serviceAccountName: cert-renewal
          restartPolicy: OnFailure
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cert-renewal
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cert-renewal
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list"]
- apiGroups: ["certificates.k8s.io"]
  resources: ["certificatesigningrequests"]
  verbs: ["get", "list", "create", "approve"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cert-renewal
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cert-renewal
subjects:
- kind: ServiceAccount
  name: cert-renewal
  namespace: kube-system
```

Kubelet certificate expiration causes preventable node failures. By implementing automatic certificate rotation, monitoring expiration dates, and creating automated renewal processes, you eliminate this failure mode. Combined with proper alerting and regular audits, these practices ensure your Kubernetes nodes maintain connectivity to the control plane without manual certificate management intervention.
