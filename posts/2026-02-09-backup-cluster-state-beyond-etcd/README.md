# How to Back Up Kubernetes Cluster State Beyond etcd Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Backup, Disaster Recovery, Cluster Management

Description: Learn how to comprehensively back up Kubernetes cluster state including not just etcd but also persistent volumes, secrets, configurations, and custom resources for complete disaster recovery.

---

etcd snapshots capture Kubernetes API state, but complete cluster backup requires more. You need persistent volume data, external secrets, certificate authorities, and configuration files. A full backup strategy includes etcd snapshots, resource exports, volume backups, and infrastructure state to enable complete cluster restoration.

## Understanding Complete Cluster State

Kubernetes cluster state exists in multiple places. etcd stores API server data including pods, services, and custom resources. Persistent volumes contain application data stored outside etcd. The control plane has certificates, kubeconfig files, and encryption keys. External systems store secrets in vaults or secret managers. Infrastructure configuration defines nodes, networks, and load balancers.

A complete backup captures all these components so you can rebuild the cluster from scratch.

## Backing Up Kubernetes Resources

Export all cluster resources to YAML files:

```bash
# Create backup directory
mkdir -p cluster-backup/$(date +%Y%m%d)
cd cluster-backup/$(date +%Y%m%d)

# Back up all namespaced resources
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  echo "Backing up namespace: $ns"
  mkdir -p $ns

  # Export common resources
  for resource in pods deployments statefulsets daemonsets services \
                  configmaps secrets persistentvolumeclaims \
                  ingresses networkpolicies serviceaccounts \
                  roles rolebindings; do
    kubectl get $resource -n $ns -o yaml > $ns/$resource.yaml 2>/dev/null || true
  done
done

# Back up cluster-scoped resources
mkdir -p cluster-resources

for resource in namespaces nodes persistentvolumes \
                storageclasses clusterroles clusterrolebindings \
                customresourcedefinitions priorityclasses \
                podsecuritypolicies validatingwebhookconfigurations \
                mutatingwebhookconfigurations; do
  kubectl get $resource -o yaml > cluster-resources/$resource.yaml 2>/dev/null || true
done

# Back up all custom resources
kubectl api-resources --verbs=list --namespaced=false -o name | \
  while read resource; do
    kubectl get $resource -o yaml > cluster-resources/$resource.yaml 2>/dev/null || true
  done

# Create tarball
tar czf ../cluster-backup-$(date +%Y%m%d-%H%M%S).tar.gz .
```

Automate with a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cluster-backup
  namespace: kube-system
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cluster-backup
          containers:
          - name: backup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_DIR=/backup/$(date +%Y%m%d)
              mkdir -p $BACKUP_DIR

              # Export all resources
              for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
                mkdir -p $BACKUP_DIR/$ns
                for resource in deployments statefulsets services configmaps secrets; do
                  kubectl get $resource -n $ns -o yaml > $BACKUP_DIR/$ns/$resource.yaml || true
                done
              done

              # Upload to S3
              aws s3 sync $BACKUP_DIR s3://cluster-backups/$(date +%Y%m%d)/
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: backup-storage
          restartPolicy: OnFailure
```

## Backing Up Persistent Volumes with Velero

Install Velero for PV backups:

```bash
# Download Velero CLI
wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
tar xzf velero-v1.12.0-linux-amd64.tar.gz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/

# Install Velero with AWS S3
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket cluster-backups \
  --secret-file ./credentials-velero \
  --backup-location-config region=us-west-2 \
  --snapshot-location-config region=us-west-2 \
  --use-volume-snapshots=true
```

Create backup schedules:

```bash
# Daily backup of all namespaces
velero schedule create daily-backup \
  --schedule="0 3 * * *" \
  --ttl 720h

# Hourly backup of critical namespace
velero schedule create production-backup \
  --schedule="0 * * * *" \
  --include-namespaces production \
  --ttl 168h

# Weekly full cluster backup
velero schedule create weekly-full \
  --schedule="0 4 * * 0" \
  --ttl 2160h
```

Backup specific resources:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: production-backup
  namespace: velero
spec:
  # Include specific namespaces
  includedNamespaces:
  - production
  - critical-apps

  # Include specific resources
  includedResources:
  - deployments
  - statefulsets
  - persistentvolumeclaims
  - configmaps
  - secrets

  # Label selector
  labelSelector:
    matchLabels:
      backup: "true"

  # Include cluster-scoped resources
  includeClusterResources: true

  # Snapshot persistent volumes
  snapshotVolumes: true

  # TTL
  ttl: 720h0m0s

  # Storage location
  storageLocation: default
```

## Backing Up Certificates and Keys

Back up PKI infrastructure:

```bash
#!/bin/bash
# backup-pki.sh

BACKUP_DIR=/backup/pki-$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Back up Kubernetes PKI
sudo cp -r /etc/kubernetes/pki $BACKUP_DIR/

# Back up etcd certificates
sudo cp -r /etc/kubernetes/pki/etcd $BACKUP_DIR/

# Back up service account key
sudo cp /etc/kubernetes/pki/sa.key $BACKUP_DIR/
sudo cp /etc/kubernetes/pki/sa.pub $BACKUP_DIR/

# Back up kubeconfig files
sudo cp -r ~/.kube $BACKUP_DIR/
sudo cp /etc/kubernetes/admin.conf $BACKUP_DIR/

# Encrypt and upload
tar czf - -C $BACKUP_DIR . | \
  gpg --symmetric --cipher-algo AES256 | \
  aws s3 cp - s3://cluster-backups/pki/backup-$(date +%Y%m%d).tar.gz.gpg

# Clean up
sudo rm -rf $BACKUP_DIR
```

## Backing Up Custom Resource Definitions

Export all CRDs and their instances:

```bash
#!/bin/bash
# backup-crds.sh

BACKUP_DIR=/backup/crds-$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Get all CRDs
kubectl get crds -o name | while read crd; do
  CRD_NAME=$(echo $crd | cut -d'/' -f2)
  echo "Backing up CRD: $CRD_NAME"

  # Export CRD definition
  kubectl get $crd -o yaml > $BACKUP_DIR/$CRD_NAME-definition.yaml

  # Export all instances
  RESOURCE=$(kubectl get $crd -o jsonpath='{.spec.names.plural}')
  kubectl get $RESOURCE --all-namespaces -o yaml > $BACKUP_DIR/$CRD_NAME-instances.yaml || true
done

# Create archive
tar czf crds-backup-$(date +%Y%m%d).tar.gz -C $BACKUP_DIR .
```

## Backing Up Helm Releases

Export Helm release state:

```bash
#!/bin/bash
# backup-helm.sh

BACKUP_DIR=/backup/helm-$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Get all Helm releases
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  helm list -n $ns -o json > $BACKUP_DIR/releases-$ns.json

  # Export values for each release
  helm list -n $ns -q | while read release; do
    helm get values $release -n $ns -o yaml > $BACKUP_DIR/$ns-$release-values.yaml
    helm get manifest $release -n $ns > $BACKUP_DIR/$ns-$release-manifest.yaml
  done
done
```

## Backing Up External Secrets

Back up secrets from external stores:

```bash
#!/bin/bash
# backup-vault-secrets.sh

BACKUP_FILE=/backup/vault-secrets-$(date +%Y%m%d).json

# Export from Vault
vault kv get -format=json secret/kubernetes | \
  jq '.' > $BACKUP_FILE

# Encrypt and upload
gpg --symmetric --cipher-algo AES256 $BACKUP_FILE
aws s3 cp $BACKUP_FILE.gpg s3://cluster-backups/secrets/
rm $BACKUP_FILE $BACKUP_FILE.gpg
```

For AWS Secrets Manager:

```bash
#!/bin/bash
# backup-aws-secrets.sh

BACKUP_FILE=/backup/aws-secrets-$(date +%Y%m%d).json

# List and export all secrets
aws secretsmanager list-secrets | \
  jq -r '.SecretList[].Name' | \
  while read secret; do
    echo "Backing up: $secret"
    aws secretsmanager get-secret-value --secret-id $secret >> $BACKUP_FILE
  done

# Encrypt and upload
gpg --symmetric --cipher-algo AES256 $BACKUP_FILE
aws s3 cp $BACKUP_FILE.gpg s3://cluster-backups/secrets/
```

## Backing Up Infrastructure as Code

Export cloud resources with Terraform:

```bash
# Back up Terraform state
aws s3 cp s3://terraform-state/kubernetes/terraform.tfstate \
  /backup/terraform-state-$(date +%Y%m%d).tfstate

# Export Terraform configuration
tar czf /backup/terraform-config-$(date +%Y%m%d).tar.gz \
  /path/to/terraform/configs
```

## Creating a Comprehensive Backup Script

Combine all backups:

```bash
#!/bin/bash
# comprehensive-backup.sh

set -e

BACKUP_ROOT=/backup/full-$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_ROOT

# 1. etcd snapshot
echo "Creating etcd snapshot..."
ETCDCTL_API=3 etcdctl snapshot save $BACKUP_ROOT/etcd-snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# 2. Kubernetes resources
echo "Exporting Kubernetes resources..."
./backup-resources.sh $BACKUP_ROOT/resources

# 3. Persistent volumes
echo "Backing up with Velero..."
velero backup create full-backup-$(date +%Y%m%d-%H%M%S) \
  --wait

# 4. Certificates
echo "Backing up certificates..."
sudo cp -r /etc/kubernetes/pki $BACKUP_ROOT/

# 5. CRDs
echo "Backing up CRDs..."
./backup-crds.sh $BACKUP_ROOT/crds

# 6. Helm releases
echo "Backing up Helm releases..."
./backup-helm.sh $BACKUP_ROOT/helm

# 7. External secrets
echo "Backing up external secrets..."
./backup-vault-secrets.sh $BACKUP_ROOT/secrets

# 8. Create manifest
cat > $BACKUP_ROOT/MANIFEST.txt <<EOF
Kubernetes Cluster Backup
Created: $(date)
Cluster: $(kubectl config current-context)
Kubernetes Version: $(kubectl version --short)

Components:
- etcd snapshot: etcd-snapshot.db
- Kubernetes resources: resources/
- Velero backup: Check Velero for backup ID
- PKI: pki/
- CRDs: crds/
- Helm releases: helm/
- External secrets: secrets/

Restore Instructions:
1. Restore etcd from snapshot
2. Restore certificates to /etc/kubernetes/pki
3. Restart API server and control plane
4. Apply Kubernetes resources
5. Restore PVs with Velero
6. Restore secrets to external vault
7. Reinstall Helm releases
EOF

# 9. Create archive
echo "Creating backup archive..."
tar czf $BACKUP_ROOT.tar.gz -C $(dirname $BACKUP_ROOT) $(basename $BACKUP_ROOT)

# 10. Encrypt and upload
echo "Encrypting and uploading..."
gpg --symmetric --cipher-algo AES256 $BACKUP_ROOT.tar.gz
aws s3 cp $BACKUP_ROOT.tar.gz.gpg \
  s3://cluster-backups/full/backup-$(date +%Y%m%d-%H%M%S).tar.gz.gpg

# 11. Clean up local files
rm -rf $BACKUP_ROOT $BACKUP_ROOT.tar.gz $BACKUP_ROOT.tar.gz.gpg

echo "Backup complete!"
```

## Automating Backup Rotation

Manage backup retention:

```bash
#!/bin/bash
# rotate-backups.sh

# Keep daily backups for 7 days
aws s3 ls s3://cluster-backups/daily/ | \
  awk '{print $4}' | \
  sort -r | \
  tail -n +8 | \
  xargs -I {} aws s3 rm s3://cluster-backups/daily/{}

# Keep weekly backups for 4 weeks
aws s3 ls s3://cluster-backups/weekly/ | \
  awk '{print $4}' | \
  sort -r | \
  tail -n +5 | \
  xargs -I {} aws s3 rm s3://cluster-backups/weekly/{}

# Keep monthly backups for 12 months
aws s3 ls s3://cluster-backups/monthly/ | \
  awk '{print $4}' | \
  sort -r | \
  tail -n +13 | \
  xargs -I {} aws s3 rm s3://cluster-backups/monthly/{}
```

## Testing Backup Restoration

Regularly test backup restoration:

```bash
#!/bin/bash
# test-restore.sh

# Create test cluster
kind create cluster --name backup-test

# Restore etcd snapshot to test cluster
# ... restoration steps ...

# Verify critical resources exist
kubectl get namespaces
kubectl get deployments --all-namespaces
kubectl get services --all-namespaces

# Run smoke tests
kubectl run test --image=nginx --restart=Never
kubectl wait --for=condition=Ready pod/test --timeout=60s
kubectl delete pod test

# Clean up test cluster
kind delete cluster --name backup-test

echo "Backup restoration test complete!"
```

Comprehensive cluster backups go beyond etcd snapshots to include persistent data, certificates, external secrets, and infrastructure state. Automate backups, test restoration procedures regularly, and maintain multiple backup copies in different locations for robust disaster recovery.
