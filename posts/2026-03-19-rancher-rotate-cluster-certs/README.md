# How to Rotate Cluster Certificates in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Certificate

Description: Learn how to rotate internal Kubernetes cluster certificates in Rancher-managed RKE and RKE2 clusters to maintain security.

Kubernetes clusters use TLS certificates for internal communication between components such as the API server, kubelet, etcd, and controller manager. These certificates have expiration dates and must be rotated before they expire to prevent cluster outages. This guide covers rotating cluster certificates in Rancher-managed clusters.

## Prerequisites

- Rancher v2.5 or later
- RKE or RKE2 managed clusters (RKE1 is end-of-life, and Rancher 2.12.0 and later no longer manage downstream RKE1 clusters)
- Admin access to Rancher
- SSH access to cluster nodes (for manual operations)

## Step 1: Check Certificate Expiration

### Via Rancher UI

1. Navigate to the cluster.
2. Review the cluster status, alerts, and recent events for certificate-related warnings.
3. If you are using Rancher to rotate certificates, schedule the work during a maintenance window because components will restart.

### Via kubectl

On RKE2 clusters, check for certificate expiration warning events:

```bash
kubectl get events -A --field-selector reason=CertificateExpirationWarning
```

### On RKE2 Nodes

```bash
rke2 certificate check --output table
```

### On RKE Nodes

```bash
for cert in /etc/kubernetes/ssl/*.pem; do
  echo "=== $cert ==="
  openssl x509 -in "$cert" -noout -dates 2>/dev/null
done
```

## Step 2: Rotate Certificates for RKE Clusters via Rancher

Rancher provides a one-click certificate rotation for RKE clusters:

1. Go to **Cluster Management**.
2. Click the three-dot menu on the RKE cluster.
3. Select **Rotate Certificates**.
4. Choose the rotation scope:
   - **Rotate all Service Certificates**: Rotates all internal cluster certificates.
   - **Rotate an Individual Service**: Rotate certificates for a specific component (etcd, kubelet, kube-apiserver, etc.).
5. Click **Save**.

Rancher will orchestrate the rotation across all nodes, restarting components as needed.

### Via the Rancher API

```bash
curl -u 'ACCESS_KEY:SECRET_KEY' -X POST \
  'https://rancher.yourdomain.com/v3/clusters/CLUSTER_ID?action=rotateCertificates' \
  -H 'Content-Type: application/json' \
  -d '{
    "services": [
      "etcd",
      "kubelet",
      "kube-apiserver",
      "kube-controller-manager",
      "kube-scheduler",
      "kube-proxy"
    ]
  }'
```

Rancher's v3 API exposes actions on the cluster resource. In practice, you should fetch the cluster resource first and follow the URL in its `actions.rotateCertificates` map entry instead of hard-coding deeper API paths.

## Step 3: Rotate Certificates for RKE2 Clusters

For Rancher-launched RKE2 clusters, Rancher can rotate the auto-generated certificates from the same **Rotate Certificates** action in the UI. If you are performing the work directly on a node, RKE2 also supports manual rotation.

### Automatic Rotation on Restart

RKE2 automatically renews certificates that are expired or within 120 days of expiry when the service is restarted. On releases prior to the May 2025 RKE2 releases, the renewal threshold was 90 days.

```bash
systemctl restart rke2-server
```

### Force Certificate Rotation

To generate new certificates and keys regardless of expiration date:

```bash
# Stop RKE2
systemctl stop rke2-server

# Rotate certificates
rke2 certificate rotate

# Start RKE2
systemctl start rke2-server
```

### Rotate on Worker Nodes

On each worker node:

```bash
systemctl restart rke2-agent
```

The agent will automatically renew its certificates from the server when it restarts.

## Step 4: Rotate etcd Certificates

etcd certificates are critical for cluster data integrity:

### Via Rancher (RKE)

1. Go to **Cluster Management** > **Rotate Certificates**.
2. Select **etcd** as the service.
3. Click **Save**.

### Manually (RKE2)

```bash
# Stop RKE2
systemctl stop rke2-server

# Rotate only the etcd certificates
rke2 certificate rotate --service etcd

# Start RKE2
systemctl start rke2-server
```

On older multi-server RKE2 releases, rotate etcd servers before rotating other server or agent nodes.

## Step 5: Verify Rotated Certificates

After rotation, verify the new certificates:

```bash
# On RKE2 nodes, check the node certificates and their expiration dates
rke2 certificate check --output table

# Check the API server certificate presented on this node
echo | openssl s_client -connect localhost:6443 2>/dev/null | \
  openssl x509 -noout -dates -subject
```

Verify cluster health after rotation:

```bash
kubectl get nodes
kubectl get pods -A
kubectl cluster-info
```

## Step 6: Handle Multi-Node Rotation

For multi-node clusters, certificates should be rotated in a controlled sequence:

1. If you are rotating through Rancher, use the UI action and let Rancher orchestrate the rollout.
2. For manual rotation on older RKE2 releases, rotate etcd servers first, then control plane servers, then agents.
3. Verify each node is healthy before continuing.
4. Restart worker nodes after server-side certificate changes so they pick up fresh client certificates.

Monitor the cluster during rotation:

```bash
kubectl get nodes -w
```

## Step 7: Update kubeconfig Files

After certificate rotation, kubeconfig files may need to be redistributed:

### For RKE2

```bash
cat /etc/rancher/rke2/rke2.yaml
```

If you use this file outside the node, copy the updated file again after rotating the `admin` certificate or CA, and replace `127.0.0.1` with the server IP or DNS name.

### For Users

Users who rely on a node-generated admin kubeconfig should receive an updated copy after `admin` or CA rotation.

## Step 8: Set Up Certificate Monitoring

For RKE2, enable `supervisor-metrics: true` and alert on the `rke2_certificate_expiration_seconds` metric:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-cert-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: cluster-certificates
    rules:
    - alert: ClusterCertExpiring
      expr: |
        min by (subject, usage) (rke2_certificate_expiration_seconds) < 2592000
      labels:
        severity: warning
      annotations:
        summary: "RKE2 certificate expiring within 30 days"
```

Create a script to check RKE2 certificates across all nodes in a cluster:

```bash
#!/bin/bash
for node in $(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'); do
  echo "=== Node: $node ==="
  ssh "$node" 'sudo rke2 certificate check --output table' 2>/dev/null
done
```

## Troubleshooting

### Cluster Becomes Unavailable After Rotation

If a node fails to rejoin after certificate rotation:

```bash
# Check kubelet logs
journalctl -u rke2-server -f
# or
journalctl -u rke2-agent -f
```

Restart the node's RKE2 service to trigger certificate re-negotiation.

### API Server Returns Certificate Errors

Check the server log and inspect the current certificate state:

```bash
journalctl -u rke2-server -f
rke2 certificate check --output table
```

### kubectl Returns Authentication Errors

If you are using the node-generated admin kubeconfig, copy a fresh `/etc/rancher/rke2/rke2.yaml` after rotating the `admin` certificate or CA.

## Conclusion

Regular certificate rotation is essential for maintaining the security and availability of your Rancher-managed clusters. By using Rancher's built-in rotation features for RKE clusters and RKE2's renewal-on-restart behavior or `rke2 certificate rotate`, you can keep certificates current with minimal disruption. Combine rotation with monitoring to prevent unexpected expirations.
