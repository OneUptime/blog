# How to Rotate RKE2 Certificates - Rotate Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Certificate, TLS, Security, Kubernetes, Certificate Rotation, SUSE Rancher

Description: Learn how to rotate RKE2 cluster certificates manually and automatically, including the API server, etcd, and kubelet certificates, to maintain cluster security.

---

RKE2 client and server certificates expire after 365 days by default. RKE2-generated CA certificates are valid for 10 years and are not automatically renewed. Certificate renewal and rotation are essential for maintaining cluster security and preventing unexpected outages caused by certificate expiry.

---

## Step 1: Check Certificate Expiry

Before rotating, check when your certificates expire:

```bash
# Check all RKE2 certificate expiry dates on this node
rke2 certificate check --output table

# Inspect certificate files directly
for cert in /var/lib/rancher/rke2/server/tls/*.crt; do
  echo "=== $cert ==="
  openssl x509 -in "$cert" -noout -dates 2>/dev/null
done

# Inspect CA certificates
openssl x509 -in /var/lib/rancher/rke2/server/tls/server-ca.crt -noout -dates
openssl x509 -in /var/lib/rancher/rke2/server/tls/client-ca.crt -noout -dates

# Check etcd certificates
for cert in /var/lib/rancher/rke2/server/tls/etcd/*.crt; do
  echo "=== $cert ==="
  openssl x509 -in "$cert" -noout -dates 2>/dev/null
done
```

---

## Step 2: Automatic Certificate Renewal

RKE2 automatically renews client and server certificates that are expired or expire within 120 days when RKE2 starts. This renewal extends the existing certificates and reuses their keys. Prior to the May 2025 RKE2 releases, the renewal window was 90 days. This is the safest renewal method:

```bash
# Restart RKE2 server - certificates inside the renewal window are renewed
systemctl restart rke2-server

# Verify certificates were renewed
rke2 certificate check --output table
```

---

## Step 3: Force Certificate Rotation

To force rotation regardless of expiry:

```bash
# On each server node, stop RKE2
systemctl stop rke2-server

# Rotate certificates on that node
rke2 certificate rotate

# Start RKE2 on that node
systemctl start rke2-server

# Verify the node is ready before moving to the next server node
kubectl get nodes
```

---

## Step 4: Rotate Only Specific Certificates

To rotate a specific component's certificate:

```bash
# Rotate only the API server certificate
rke2 certificate rotate --service api-server

# Rotate only the etcd certificates
rke2 certificate rotate --service etcd

# Rotate only the kubelet certificates
rke2 certificate rotate --service kubelet
```

---

## Step 5: Update kubeconfig After Rotation

After certificate rotation, the kubeconfig file is updated automatically, but clients using cached kubeconfigs need to refresh:

```bash
# Copy the updated kubeconfig
mkdir -p ~/.kube
cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
chmod 600 ~/.kube/config

# Update the kubeconfig server address if needed
kubectl config set-cluster default \
  --server=https://<api-server-ip>:6443

# Verify connectivity
kubectl get nodes
```

---

## Step 6: Renew Agent Node Certificates

Agent nodes also have certificates that need renewal:

```bash
# On each agent node, restart RKE2 agent
systemctl restart rke2-agent

# Verify the agent reconnected
# (run on a server node)
kubectl get nodes
```

---

## Step 7: Verify After Rotation

```bash
# Confirm new expiry dates
rke2 certificate check --output table

# Check cluster health
kubectl get nodes
kubectl get pods -n kube-system

# Check etcd health
/var/lib/rancher/rke2/bin/etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key \
  endpoint health
```

---

## Scheduling Certificate Renewal

```bash
# Create a cron job to restart RKE2 so certificates renew once inside the renewal window
# /etc/cron.d/rke2-cert-renewal
0 2 1 * * root systemctl restart rke2-server

# Or use a Kubernetes CronJob to trigger renewal or rotation via a management script
```

---

## Best Practices

- Rotate certificates every 6 months rather than waiting for the 120-day auto-renewal window - this gives more predictable maintenance windows.
- Always take an etcd snapshot before rotating certificates - a failed rotation can leave the cluster in a broken state.
- Test certificate rotation in a staging cluster first to understand the restart sequence and any application impact.
