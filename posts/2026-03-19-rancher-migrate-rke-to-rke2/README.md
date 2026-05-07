# How to Migrate Rancher from RKE to RKE2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Migration, RKE, RKE2

Description: A practical guide to migrating your Rancher management cluster from RKE (RKE1) to RKE2 for improved security and stability.

RKE2 is the next-generation Kubernetes distribution from Rancher, offering improved security defaults, FIPS compliance, and better alignment with upstream Kubernetes. Migrating your Rancher management cluster from RKE to RKE2 is a recommended path for long-term stability. This guide covers the complete migration process.

## Why Migrate from RKE to RKE2

RKE2 provides several advantages over RKE1:

- Embedded etcd instead of Docker-managed etcd
- CIS hardened by default
- Does not depend on Docker as a container runtime
- Uses containerd directly
- Better support for air-gapped environments
- Active development and long-term support

## Prerequisites

- An existing Rancher v2.5.0 or later installation running on an RKE1 cluster
- New infrastructure for the RKE2 cluster (at least 3 server nodes recommended)
- Helm 3 and kubectl installed
- S3-compatible storage for backups
- DNS control for the Rancher hostname; the migrated cluster must use the same Rancher hostname/server URL
- A Rancher-supported Kubernetes version on the target RKE2 cluster; do not change Rancher or Kubernetes versions during the migration

## Step 1: Document the Current RKE Setup

Record your current configuration:

```bash
# Rancher version

kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'

# Helm values
helm get values rancher -n cattle-system -o yaml > rke-rancher-values.yaml

# RKE cluster config
cat cluster.yml

# Managed clusters
kubectl get clusters.management.cattle.io -o wide
```

## Step 2: Back Up the RKE Cluster

### Take an etcd Snapshot

```bash
rke etcd snapshot-save --config cluster.yml --name rke-to-rke2-migration
```

### Install and Run Rancher Backup Operator

Install the backup operator on the RKE cluster:

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

CHART_VERSION=<RANCHER_BACKUP_VERSION_COMPATIBLE_WITH_YOUR_RANCHER_VERSION>

helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  -n cattle-resources-system --create-namespace \
  --version $CHART_VERSION

helm install rancher-backup rancher-charts/rancher-backup \
  -n cattle-resources-system \
  --version $CHART_VERSION
```

Create S3 credentials:

```bash
kubectl create secret generic s3-creds \
  -n cattle-resources-system \
  --from-literal=accessKey=YOUR_ACCESS_KEY \
  --from-literal=secretKey=YOUR_SECRET_KEY
```

Create the backup:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rke-to-rke2-backup
spec:
  resourceSetName: rancher-resource-set-full
  storageLocation:
    s3:
      bucketName: rancher-backups
      endpoint: s3.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

```bash
kubectl apply -f backup.yaml
kubectl get backups rke-to-rke2-backup -w
```

## Step 3: Build the RKE2 Cluster

Use a fixed registration address or load balancer in front of the RKE2 server nodes. It must forward TCP 9345 for node registration and TCP 6443 for the Kubernetes API.

### Install RKE2 on the First Server Node

```bash
curl -sfL https://get.rke2.io | sh -

mkdir -p /etc/rancher/rke2

cat > /etc/rancher/rke2/config.yaml <<EOF
tls-san:
  - rancher.yourdomain.com
  - <LOAD_BALANCER_IP>
  - <NODE1_IP>
write-kubeconfig-mode: "0644"
EOF

systemctl enable rke2-server
systemctl start rke2-server
```

Get the node token for joining additional nodes:

```bash
cat /var/lib/rancher/rke2/server/node-token
```

### Add Additional Server Nodes

On each additional server node:

```bash
curl -sfL https://get.rke2.io | sh -

mkdir -p /etc/rancher/rke2

cat > /etc/rancher/rke2/config.yaml <<EOF
server: https://<LOAD_BALANCER_IP>:9345
token: <NODE_TOKEN>
tls-san:
  - rancher.yourdomain.com
  - <LOAD_BALANCER_IP>
EOF

systemctl enable rke2-server
systemctl start rke2-server
```

### Configure kubectl

```bash
mkdir -p ~/.kube
cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
sed -i 's/127.0.0.1/<LOAD_BALANCER_IP>/g' ~/.kube/config
chmod 600 ~/.kube/config
```

Verify the cluster:

```bash
kubectl get nodes
```

## Step 4: Install the Backup Operator on the RKE2 Cluster

```bash
CHART_VERSION=<RANCHER_BACKUP_VERSION_COMPATIBLE_WITH_YOUR_RANCHER_VERSION>

helm repo add rancher-charts https://charts.rancher.io
helm repo update

helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  -n cattle-resources-system --create-namespace \
  --version $CHART_VERSION

helm install rancher-backup rancher-charts/rancher-backup \
  -n cattle-resources-system \
  --version $CHART_VERSION
```

## Step 5: Restore the Backup

### Create S3 Credentials

```bash
kubectl create secret generic s3-creds \
  -n cattle-resources-system \
  --from-literal=accessKey=YOUR_ACCESS_KEY \
  --from-literal=secretKey=YOUR_SECRET_KEY
```

### Run the Restore

```yaml
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: rke-to-rke2-restore
spec:
  backupFilename: rke-to-rke2-backup-<timestamp>.tar.gz
  prune: false
  storageLocation:
    s3:
      bucketName: rancher-backups
      endpoint: s3.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

```bash
kubectl apply -f restore.yaml
kubectl get restores rke-to-rke2-restore -w
kubectl logs -n cattle-resources-system --tail 100 -f -l app.kubernetes.io/instance=rancher-backup
```

After the restore is `Completed`, and before bringing up Rancher on the new cluster, edit the restored local cluster object so Rancher can detect the distribution change:

```bash
kubectl edit clusters.management.cattle.io local
```

Make these changes before saving:

- Change `status.driver` to `imported`
- Remove `status.provider`
- Remove the entire `status.version` map
- Remove the `provider.cattle.io` label from `metadata.labels`
- Remove the `management.cattle.io/current-cluster-controllers-version` annotation from `metadata.annotations`
- Remove `spec.rke2Config` or `spec.k3sConfig` if either field is present

## Step 6: Install cert-manager and Rancher on the RKE2 Cluster

Install a cert-manager version supported by your Rancher release:

```bash
CERT_MANAGER_VERSION=<CERT_MANAGER_VERSION_SUPPORTED_BY_YOUR_RANCHER_RELEASE>

kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.crds.yaml

helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version ${CERT_MANAGER_VERSION}
```

Use the same Rancher version and values as the RKE installation. Make sure your kubeconfig points to the new RKE2 cluster before running the install:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  -f rke-rancher-values.yaml \
  --set hostname=rancher.yourdomain.com \
  --version <SAME_RANCHER_VERSION_AS_RKE>
```

Wait for deployment:

```bash
kubectl rollout status deployment rancher -n cattle-system
```

## Step 7: Update DNS and Verify

Switch your DNS records to point to the RKE2 cluster load balancer.

After traffic is redirected, scale the original Rancher deployment to zero so downstream agents stop contacting it:

```bash
# Against the original RKE cluster
kubectl scale deployment rancher -n cattle-system --replicas=0
```

Log in to the Rancher UI and verify:

- All managed clusters are listed and active
- User accounts and roles are preserved
- Global settings are correct
- Downstream cluster agents are connected

## Step 8: Decommission the RKE Cluster

After confirming everything works:

```bash
# On the RKE cluster
helm uninstall rancher -n cattle-system

# Remove the RKE cluster
rke remove --config cluster.yml
```

Copy any RKE etcd snapshots you want to keep off-cluster before running `rke remove`, because it removes local snapshots and can also remove RKE-managed snapshots stored on S3.

Keep your external backups for at least 30 days.

## Troubleshooting

- **Agent connection issues**: Downstream agents may take several minutes to reconnect. If they remain disconnected, re-deploy the agent manifests from the Rancher UI.
- **Webhook conflicts**: If webhook-related API errors persist after the restore, inspect the Rancher and `rancher-backup` logs before removing any stale webhook resources.
- **Storage class differences**: If the RKE2 cluster uses different storage classes, update PVC references accordingly.

## Conclusion

Migrating from RKE to RKE2 gives your Rancher management cluster a more secure and maintainable foundation. The Rancher Backup and Restore operator handles the data migration cleanly, making the transition manageable. Plan the migration during a maintenance window, verify all downstream clusters after the switch, and keep your RKE backups until the RKE2 installation is proven stable.
