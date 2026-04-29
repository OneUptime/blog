# How to Rotate K3s Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Security, TLS, Certificate, DevOps

Description: Learn how to rotate TLS certificates in K3s to maintain security compliance and prevent certificate expiration issues.

## Introduction

K3s automatically generates TLS certificates during startup. Client and server certificates are valid for 365 days and are automatically renewed on restart if they are expired or within 120 days of expiring. Certificate rotation is a critical security practice that prevents unexpected cluster outages caused by expired certificates. This guide covers both automatic and manual certificate rotation in K3s.

## Understanding K3s Certificates

On server nodes, K3s stores several control-plane and CA certificates in `/var/lib/rancher/k3s/server/tls/`:

- **CA certificates**: Root of trust for the cluster
- **API server certificates**: Secures the kube-apiserver
- **Controller manager certificates**: For the controller-manager component
- **Scheduler certificates**: For the kube-scheduler
- **etcd certificates**: Secures etcd communication
- **Kubelet certificates**: For the server node's kubelet

## Check Certificate Expiration

Before rotating, check when your certificates expire:

```bash
# Check all node certificate expiration dates
k3s certificate check --output table

# Check specific certificate
openssl x509 -in /var/lib/rancher/k3s/server/tls/server-ca.crt \
  -noout -text | grep -A 2 "Validity"

# Quick expiry check for the API server certificate
openssl x509 -in /var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt \
  -noout -enddate
```

## Automatic Certificate Rotation

K3s automatically renews certificates when it restarts if they are expired or will expire within **120 days**. Simply restarting K3s triggers this:

```bash
# Restart K3s to trigger automatic renewal for certificates expiring within 120 days
systemctl restart k3s

# Verify the updated expiration dates
k3s certificate check --output table
```

## Manual Certificate Rotation

To force certificate rotation regardless of expiration:

```bash
# Step 1: Stop the K3s service
systemctl stop k3s

# Step 2: Run certificate rotation
# This regenerates client and server certificates
k3s certificate rotate

# Step 3: Start K3s
systemctl start k3s

# Step 4: Verify K3s is healthy
kubectl get nodes
```

### Rotating Specific Certificates

You can also rotate only specific certificates:

```bash
# Stop K3s
systemctl stop k3s

# Rotate only the API server certificate
k3s certificate rotate --service api-server

# Rotate etcd certificates
k3s certificate rotate --service etcd

# Rotate multiple certificates explicitly
k3s certificate rotate \
  --service api-server,scheduler,controller-manager,k3s-controller,k3s-server,admin

# Start K3s
systemctl start k3s
```

## Rotating CA Certificates

CA rotation is more involved since all leaf certificates must be re-issued. K3s does not automatically rotate CA certificates - they have a 10-year validity period. If you need to rotate the default K3s-generated self-signed CAs:

```bash
# Step 1: Back up the existing TLS directory
cp -r /var/lib/rancher/k3s/server/tls /var/lib/rancher/k3s/server/tls.backup

# Step 2: Create updated CA certs and keys, cross-signed by the current CAs
# This script creates /var/lib/rancher/k3s/server/rotate-ca and prints updated token values
curl -sL https://github.com/k3s-io/k3s/raw/main/contrib/util/rotate-default-ca-certs.sh | bash -

# Step 3: Load the updated CA certs into the datastore
k3s certificate rotate-ca --path=/var/lib/rancher/k3s/server/rotate-ca

# Step 4: Update secure tokens on any joined servers and agents before restart
# The token may be stored in a .env file, systemd unit, or config.yaml

# Step 5: Restart K3s on all nodes, servers first, then agents
systemctl restart k3s        # On server nodes
systemctl restart k3s-agent  # On agent nodes

# Step 6: Verify the cluster is healthy
kubectl get nodes
```

## Update kubeconfig After Rotation

After rotating certificates, refresh any copied kubeconfig files:

```bash
# Copy the new kubeconfig from the server
scp root@<server-ip>:/etc/rancher/k3s/k3s.yaml ~/.kube/config

# Update the server address if needed
sed -i 's/127.0.0.1/<server-ip>/g' ~/.kube/config

# Verify connectivity
kubectl cluster-info
kubectl get nodes
```

## Automate Certificate Rotation

Create a script to rotate certificates before they expire:

```bash
#!/bin/bash
# /usr/local/bin/k3s-cert-rotation-check.sh

DAYS_THRESHOLD=30
CERT_FILE="/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt"

# Get days until expiry
EXPIRY=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "Certificate expires in $DAYS_LEFT days"

if [ "$DAYS_LEFT" -lt "$DAYS_THRESHOLD" ]; then
  echo "Rotating certificates (less than $DAYS_THRESHOLD days remaining)"
  systemctl stop k3s
  k3s certificate rotate
  systemctl start k3s
  echo "Certificate rotation complete"
fi
```

## Conclusion

Regular certificate rotation is a critical security hygiene practice. K3s makes it straightforward with built-in `certificate rotate` commands. For most clusters, the automatic renewal on restart is sufficient - but for production environments, implement proactive rotation checks and alerting before certificates approach expiration to avoid unexpected outages.
