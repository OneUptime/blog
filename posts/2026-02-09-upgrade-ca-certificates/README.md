# How to Upgrade Certificate Authority Certificates During Cluster Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Certificates, Security

Description: Learn how to safely upgrade Kubernetes CA certificates during cluster upgrades including certificate rotation, trust chain updates, and zero-downtime certificate replacement strategies.

---

Certificate Authority certificates are the foundation of Kubernetes cluster security. During major upgrades or when certificates approach expiration, you may need to rotate CA certificates. This process requires careful coordination to maintain cluster connectivity while updating trust relationships.

## Understanding Kubernetes Certificates

Kubernetes uses PKI certificates for authentication between components. The cluster CA signs certificates for the API server, etcd, kubelet, and service accounts. Rotating the CA means generating a new CA certificate and gradually migrating all component certificates to trust the new CA.

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
echo "Days until expiration:"
for cert in /etc/kubernetes/pki/*.crt; do
  days=$(echo | openssl s_client -connect localhost:6443 -servername kubernetes 2>/dev/null | \
    openssl x509 -noout -checkend 0 | grep -q "will not expire" && echo "valid" || echo "expired")
  echo "  $(basename $cert): $days"
done
```

## Backing Up Existing Certificates

Always backup certificates before rotation.

```bash
#!/bin/bash
# backup-certificates.sh

BACKUP_DIR="/backups/k8s-certs-$(date +%Y%m%d-%H%M%S)"

echo "Backing up certificates to $BACKUP_DIR..."

mkdir -p $BACKUP_DIR

# Backup PKI directory
sudo cp -r /etc/kubernetes/pki $BACKUP_DIR/

# Backup etcd certificates
sudo cp -r /etc/kubernetes/pki/etcd $BACKUP_DIR/etcd

# Create archive
tar czf $BACKUP_DIR.tar.gz $BACKUP_DIR

echo "Backup complete: $BACKUP_DIR.tar.gz"
```

## Generating New CA Certificate

Create a new CA certificate while keeping the old one temporarily.

```bash
#!/bin/bash
# generate-new-ca.sh

echo "Generating new CA certificate..."

# Generate new CA key
openssl genrsa -out /etc/kubernetes/pki/ca-new.key 2048

# Generate new CA certificate
openssl req -x509 -new -nodes \
  -key /etc/kubernetes/pki/ca-new.key \
  -days 3650 \
  -out /etc/kubernetes/pki/ca-new.crt \
  -subj "/CN=kubernetes-ca"

# Verify new certificate
openssl x509 -in /etc/kubernetes/pki/ca-new.crt -text -noout

echo "New CA certificate generated"
```

## Implementing Certificate Rotation

Use kubeadm to rotate certificates automatically.

```bash
#!/bin/bash
# rotate-certificates-kubeadm.sh

echo "Rotating Kubernetes certificates..."

# Check current certificate status
sudo kubeadm certs check-expiration

# Renew all certificates
sudo kubeadm certs renew all

# Restart control plane components
sudo systemctl restart kubelet

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

# Rotate API server certificate
openssl genrsa -out /etc/kubernetes/pki/apiserver-new.key 2048

openssl req -new -key /etc/kubernetes/pki/apiserver-new.key \
  -out /etc/kubernetes/pki/apiserver.csr \
  -subj "/CN=kube-apiserver"

openssl x509 -req \
  -in /etc/kubernetes/pki/apiserver.csr \
  -CA $CA_CERT \
  -CAkey $CA_KEY \
  -CAcreateserial \
  -out /etc/kubernetes/pki/apiserver-new.crt \
  -days 365

# Update API server manifest to use new certificate
sudo mv /etc/kubernetes/pki/apiserver-new.crt /etc/kubernetes/pki/apiserver.crt
sudo mv /etc/kubernetes/pki/apiserver-new.key /etc/kubernetes/pki/apiserver.key

# Restart API server
sudo systemctl restart kube-apiserver
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
cat $OLD_CA $NEW_CA > /etc/kubernetes/pki/ca-bundle.crt

# Update kubeconfig files
for config in ~/.kube/config /etc/kubernetes/admin.conf; do
  if [ -f "$config" ]; then
    kubectl config set-cluster kubernetes \
      --certificate-authority=/etc/kubernetes/pki/ca-bundle.crt \
      --embed-certs=true \
      --kubeconfig=$config
  fi
done

# Update kubelet configuration
sudo sed -i 's|ca.crt|ca-bundle.crt|g' /var/lib/kubelet/config.yaml
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
    sudo cp /tmp/ca-bundle.crt /etc/kubernetes/pki/ca.crt

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
apiVersion: helm.sh/v3
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  chart:
    spec:
      chart: cert-manager
      sourceRef:
        kind: HelmRepository
        name: jetstack
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
      expr: (apiserver_client_certificate_expiration_seconds_count{job="apiserver"} < 86400 * 30)
      for: 1h
      annotations:
        summary: "Certificate expiring in less than 30 days"
        description: "Certificate for {{ $labels.name }} expires in {{ $value | humanizeDuration }}"

    - alert: CertificateExpired
      expr: (apiserver_client_certificate_expiration_seconds_count{job="apiserver"} < 0)
      annotations:
        summary: "Certificate has expired"
        description: "Certificate for {{ $labels.name }} has expired"
```

Upgrading CA certificates during Kubernetes upgrades requires careful planning and execution. By backing up existing certificates, implementing gradual rotation strategies, maintaining dual trust chains during transitions, and monitoring certificate expiration, you can rotate CA certificates safely without disrupting cluster operations.
