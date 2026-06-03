# How to Upgrade Certificate Authority Certificates During Cluster Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Certificate, Security

Description: Learn how to safely upgrade Kubernetes CA certificates during cluster upgrades including certificate rotation, trust chain updates, and zero-downtime certificate replacement strategies.

---

Certificate Authority certificates are the foundation of Kubernetes cluster security. During major upgrades or when certificates approach expiration, you may need to rotate CA certificates. This process requires careful coordination to maintain cluster connectivity while updating trust relationships.

## Understanding Kubernetes Certificates

Kubernetes uses PKI certificates for authentication between components. The cluster CA signs certificates for the API server, kubelet clients, controller manager, scheduler, and other X.509 clients; kubeadm also creates separate CAs for etcd and the front proxy. Service account tokens are signed with the service account key pair, not the cluster CA. Rotating the CA means generating a new CA certificate and gradually migrating all component certificates to trust the new CA.

Certificate rotation during upgrades is necessary when certificates are approaching expiration, when migrating to stronger cryptographic algorithms, or when compliance requires periodic CA rotation. The process must maintain service continuity throughout.

## Checking Current Certificates

Before rotating, examine your current certificate status.

```bash
#!/bin/bash
# check-certificates.sh

echo "Checking Kubernetes certificates..."

# Check API server certificate

echo "API Server certificate:"
kubectl get pod -n kube-system -l component=kube-apiserver -o yaml | \
  grep -A 5 "tls-cert-file"

# Extract and examine certificate
API_CERT="/etc/kubernetes/pki/apiserver.crt"
if [ -f "$API_CERT" ]; then
  echo "Certificate details:"
  openssl x509 -in $API_CERT -text -noout | \
    grep -E "Subject:|Issuer:|Not Before|Not After"
fi

# Check all certificates in pki directory
for cert in /etc/kubernetes/pki/*.crt; do
  echo "Certificate: $cert"
  openssl x509 -in $cert -noout -dates
done

# Check certificate expiration
echo "Expiration status:"
for cert in /etc/kubernetes/pki/*.crt; do
  if openssl x509 -in "$cert" -noout -checkend $((30 * 24 * 60 * 60)); then
    status="valid for more than 30 days"
  else
    status="expires within 30 days or is already expired"
  fi
  echo "  $(basename "$cert"): $status"
done
```

## Backing Up Existing Certificates

Always backup certificates before rotation.

```bash
#!/bin/bash
# backup-certificates.sh

BACKUP_DIR="/backups/k8s-certs-$(date +%Y%m%d-%H%M%S)"

echo "Backing up certificates to $BACKUP_DIR..."

sudo mkdir -p "$BACKUP_DIR"

# Backup PKI directory
sudo cp -a /etc/kubernetes/pki "$BACKUP_DIR/"

# Create archive
sudo tar czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"

echo "Backup complete: $BACKUP_DIR.tar.gz"
```

## Generating New CA Certificate

Create a new CA certificate while keeping the old one temporarily.

```bash
#!/bin/bash
# generate-new-ca.sh

echo "Generating new CA certificate..."

# Generate new CA key
sudo openssl genrsa -out /etc/kubernetes/pki/ca-new.key 4096

# Generate new CA certificate
sudo openssl req -x509 -new -nodes -sha256 \
  -key /etc/kubernetes/pki/ca-new.key \
  -days 3650 \
  -out /etc/kubernetes/pki/ca-new.crt \
  -subj "/CN=kubernetes-ca" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" \
  -addext "subjectKeyIdentifier=hash"

# Verify new certificate
openssl x509 -in /etc/kubernetes/pki/ca-new.crt -text -noout

echo "New CA certificate generated"
```

## Implementing Certificate Rotation

Use kubeadm to renew control plane certificates after the target CA is in place. The `kubeadm certs renew` command renews leaf certificates; it does not renew CA certificates.

```bash
#!/bin/bash
# rotate-certificates-kubeadm.sh

echo "Rotating Kubernetes certificates..."

# Check current certificate status
sudo kubeadm certs check-expiration

# Renew all certificates
sudo kubeadm certs renew all

# Restart static Pod control plane components
sudo mkdir -p /etc/kubernetes/manifests.backup
for manifest in kube-apiserver.yaml kube-controller-manager.yaml kube-scheduler.yaml; do
  sudo mv "/etc/kubernetes/manifests/$manifest" /etc/kubernetes/manifests.backup/
  sleep 20
  sudo mv "/etc/kubernetes/manifests.backup/$manifest" /etc/kubernetes/manifests/
  sleep 20
done

# Wait for components to restart
sleep 30

# Verify new certificates
sudo kubeadm certs check-expiration

echo "Certificate rotation complete"
```

For manual certificate rotation:

```bash
#!/bin/bash
# manual-cert-rotation.sh

CA_CERT="/etc/kubernetes/pki/ca.crt"
CA_KEY="/etc/kubernetes/pki/ca.key"
SERVICE_CIDR_IP="10.96.0.1"
CONTROL_PLANE_DNS="control-plane.example.com"

# Rotate API server certificate
sudo openssl genrsa -out /etc/kubernetes/pki/apiserver-new.key 2048

sudo openssl req -new -key /etc/kubernetes/pki/apiserver-new.key \
  -out /etc/kubernetes/pki/apiserver.csr \
  -subj "/CN=kube-apiserver" \
  -addext "subjectAltName=DNS:kubernetes,DNS:kubernetes.default,DNS:kubernetes.default.svc,DNS:$CONTROL_PLANE_DNS,IP:$SERVICE_CIDR_IP" \
  -addext "extendedKeyUsage=serverAuth"

sudo openssl x509 -req \
  -in /etc/kubernetes/pki/apiserver.csr \
  -CA $CA_CERT \
  -CAkey $CA_KEY \
  -CAcreateserial \
  -out /etc/kubernetes/pki/apiserver-new.crt \
  -days 365 \
  -copy_extensions copy

# Replace API server certificate and key
sudo mv /etc/kubernetes/pki/apiserver-new.crt /etc/kubernetes/pki/apiserver.crt
sudo mv /etc/kubernetes/pki/apiserver-new.key /etc/kubernetes/pki/apiserver.key

# Restart the static Pod API server
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /etc/kubernetes/
sleep 20
sudo mv /etc/kubernetes/kube-apiserver.yaml /etc/kubernetes/manifests/
```

## Updating Trust Chains

Update all components to trust the new CA certificate.

```bash
#!/bin/bash
# update-trust-chains.sh

NEW_CA="/etc/kubernetes/pki/ca-new.crt"
OLD_CA="/etc/kubernetes/pki/ca.crt"

echo "Updating trust chains..."

# Create combined CA bundle (old + new)
sudo sh -c "cat '$OLD_CA' '$NEW_CA' > /etc/kubernetes/pki/ca-bundle.crt"

# Update kubeconfig files
if [ -f ~/.kube/config ]; then
  kubectl config set-cluster kubernetes \
    --certificate-authority=/etc/kubernetes/pki/ca-bundle.crt \
    --embed-certs=true \
    --kubeconfig=~/.kube/config
fi

if [ -f /etc/kubernetes/admin.conf ]; then
  sudo kubectl config set-cluster kubernetes \
    --certificate-authority=/etc/kubernetes/pki/ca-bundle.crt \
    --embed-certs=true \
    --kubeconfig=/etc/kubernetes/admin.conf
fi

# Update kubelet kubeconfig
sudo kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/pki/ca-bundle.crt \
  --embed-certs=true \
  --kubeconfig=/etc/kubernetes/kubelet.conf
sudo systemctl restart kubelet

echo "Trust chains updated"
```

## Rolling Certificate Updates Across Nodes

Update certificates on worker nodes without downtime.

```bash
#!/bin/bash
# rolling-cert-update.sh

NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')

for node in $NODES; do
  echo "Updating certificates on $node..."

  # Cordon node
  kubectl cordon $node

  # Drain node
  kubectl drain $node --ignore-daemonsets --delete-emptydir-data

  # SSH to node and update certificates
  ssh $node << 'ENDSSH'
    # Stop kubelet
    sudo systemctl stop kubelet

    # Update CA certificate
    sudo cp /tmp/ca-bundle.crt /etc/kubernetes/pki/ca-bundle.crt
    sudo kubectl config set-cluster kubernetes \
      --certificate-authority=/etc/kubernetes/pki/ca-bundle.crt \
      --embed-certs=true \
      --kubeconfig=/etc/kubernetes/kubelet.conf

    # Regenerate kubelet certificate
    sudo rm /var/lib/kubelet/pki/kubelet-client-current.pem

    # Start kubelet (will request new certificate)
    sudo systemctl start kubelet
ENDSSH

  # Wait for node to be ready
  sleep 60

  # Uncordon node
  kubectl uncordon $node

  echo "Node $node updated"
  sleep 120
done

echo "All nodes updated"
```

## Verifying Certificate Updates

Validate that certificate rotation completed successfully.

```bash
#!/bin/bash
# verify-cert-rotation.sh

echo "Verifying certificate rotation..."

# Check API server certificate
echo "Checking API server certificate..."
echo | openssl s_client -connect localhost:6443 2>/dev/null | \
  openssl x509 -noout -dates

# Check all nodes have new certificates
kubectl get nodes -o json | jq -r '.items[].metadata.name' | \
  while read node; do
    echo "Checking node: $node"
    kubectl get csr | grep $node
  done

# Verify kubelet can communicate with API server
kubectl get nodes

# Test creating and accessing resources
kubectl run test-cert --image=nginx --rm -it --restart=Never -- echo "Certificate test passed"

echo "Certificate rotation verification complete"
```

## Automated Certificate Management

Implement cert-manager for automatic certificate renewal.

```yaml
# cert-manager-setup.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: cert-manager
spec:
  interval: 1h
  url: https://charts.jetstack.io
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 1h
  chart:
    spec:
      chart: cert-manager
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: cert-manager
      version: v1.14.0
  values:
    installCRDs: true
    prometheus:
      enabled: true
```

Configure automatic rotation:

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: kubernetes-ca
  namespace: kube-system
spec:
  isCA: true
  commonName: kubernetes-ca
  secretName: kubernetes-ca-secret
  privateKey:
    algorithm: RSA
    size: 2048
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
  duration: 87600h  # 10 years
  renewBefore: 720h  # 30 days
```

## Monitoring Certificate Expiration

Set up monitoring to prevent certificate expiration.

```yaml
# prometheus-cert-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-expiration
  namespace: monitoring
spec:
  groups:
  - name: certificates
    interval: 1h
    rules:
    - alert: CertificateExpiringSoon
      expr: histogram_quantile(0.01, sum by (le) (rate(apiserver_client_certificate_expiration_seconds_bucket{job="apiserver"}[5m]))) < 86400 * 30
      for: 1h
      annotations:
        summary: "Certificate expiring in less than 30 days"
        description: "An API server client certificate expires in {{ $value | humanizeDuration }}."

    - alert: CertificateExpired
      expr: histogram_quantile(0.01, sum by (le) (rate(apiserver_client_certificate_expiration_seconds_bucket{job="apiserver"}[5m]))) <= 0
      annotations:
        summary: "Certificate has expired"
        description: "An API server client certificate has expired."
```

Upgrading CA certificates during Kubernetes upgrades requires careful planning and execution. By backing up existing certificates, implementing gradual rotation strategies, maintaining dual trust chains during transitions, and monitoring certificate expiration, you can rotate CA certificates safely without disrupting cluster operations.
