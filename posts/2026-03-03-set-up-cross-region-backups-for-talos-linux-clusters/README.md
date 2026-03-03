# How to Set Up Cross-Region Backups for Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cross-Region Backup, Kubernetes, Disaster Recovery, Cloud Infrastructure

Description: Learn how to configure cross-region backup strategies for Talos Linux clusters to protect against regional failures and ensure data durability.

---

When you run Talos Linux clusters in a single region, you are exposed to a regional failure taking out everything - your cluster, your data, and your backups. Cross-region backups protect you against this scenario by storing copies of your critical data in a geographically separate location. Even if an entire region goes down, you can rebuild from backups stored elsewhere.

This guide walks through setting up cross-region backups for both Talos Linux infrastructure state and Kubernetes workload data.

## What Needs Cross-Region Backup

For a complete Talos Linux cluster, you need to replicate several types of data across regions:

1. **etcd snapshots** - Contains all Kubernetes cluster state
2. **Talos machine configurations** - Defines the OS-level configuration for each node
3. **Talos PKI certificates** - Required to authenticate with the cluster
4. **Kubernetes workload backups** - Application data, persistent volumes, and resource definitions
5. **Infrastructure-as-Code files** - Terraform, Pulumi, or other provisioning configs

## Architecture Overview

A solid cross-region backup setup looks like this:

- Primary cluster runs in Region A
- Backups are first written to object storage in Region A
- Replication copies backups to object storage in Region B
- Optionally, a third copy goes to Region C for additional safety

```
Region A (Primary)           Region B (Backup)          Region C (Archive)
+------------------+        +------------------+       +------------------+
| Talos Cluster    |        | S3 Bucket        |       | S3 Bucket        |
| + Velero         |------->| (replica)        |------>| (archive)        |
| + etcd snapshots |        |                  |       |                  |
+------------------+        +------------------+       +------------------+
        |
        v
+------------------+
| S3 Bucket        |
| (primary)        |
+------------------+
```

## Setting Up S3 Cross-Region Replication

If you are using AWS, S3 Cross-Region Replication (CRR) is the simplest approach.

### Create Buckets in Both Regions

```bash
# Primary bucket in us-east-1
aws s3api create-bucket \
  --bucket talos-backups-primary \
  --region us-east-1

# Replica bucket in eu-west-1
aws s3api create-bucket \
  --bucket talos-backups-replica \
  --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1

# Enable versioning on both buckets (required for CRR)
aws s3api put-bucket-versioning \
  --bucket talos-backups-primary \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
  --bucket talos-backups-replica \
  --versioning-configuration Status=Enabled
```

### Create IAM Role for Replication

```bash
# Create the replication role
cat > replication-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name s3-replication-role \
  --assume-role-policy-document file://replication-trust-policy.json

# Attach the replication policy
cat > replication-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::talos-backups-primary"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl"
      ],
      "Resource": "arn:aws:s3:::talos-backups-primary/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete"
      ],
      "Resource": "arn:aws:s3:::talos-backups-replica/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name s3-replication-role \
  --policy-name s3-replication-policy \
  --policy-document file://replication-policy.json
```

### Enable Replication

```bash
cat > replication-config.json <<EOF
{
  "Role": "arn:aws:iam::ACCOUNT_ID:role/s3-replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {},
      "Destination": {
        "Bucket": "arn:aws:s3:::talos-backups-replica",
        "StorageClass": "STANDARD_IA"
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
EOF

aws s3api put-bucket-replication \
  --bucket talos-backups-primary \
  --replication-configuration file://replication-config.json
```

## Automating etcd Snapshot Replication

Set up a CronJob that takes regular etcd snapshots and uploads them to your primary bucket. S3 replication handles copying to the secondary region.

```bash
#!/bin/bash
# etcd-backup-to-s3.sh
# Run this from a machine with talosctl access

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_FILE="/tmp/etcd-snapshot-${TIMESTAMP}.snapshot"
BUCKET="s3://talos-backups-primary/etcd-snapshots"

# Take the etcd snapshot
talosctl -n 10.0.1.10 etcd snapshot "$SNAPSHOT_FILE"

# Verify snapshot is not empty
if [ ! -s "$SNAPSHOT_FILE" ]; then
  echo "ERROR: Snapshot file is empty or missing"
  exit 1
fi

# Upload to S3
aws s3 cp "$SNAPSHOT_FILE" "${BUCKET}/${TIMESTAMP}.snapshot"

# Clean up local file
rm -f "$SNAPSHOT_FILE"

# Remove snapshots older than 30 days from S3
aws s3 ls "${BUCKET}/" | while read -r line; do
  FILE_DATE=$(echo "$line" | awk '{print $1}')
  FILE_NAME=$(echo "$line" | awk '{print $4}')
  if [[ $(date -d "$FILE_DATE" +%s) -lt $(date -d "30 days ago" +%s) ]]; then
    aws s3 rm "${BUCKET}/${FILE_NAME}"
  fi
done

echo "Backup completed: ${TIMESTAMP}.snapshot"
```

You can run this as a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: backup-system
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: alpine/k8s:1.30.0
            command: ["/bin/bash", "/scripts/etcd-backup-to-s3.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
            - name: talos-config
              mountPath: /root/.talos
          volumes:
          - name: scripts
            configMap:
              name: backup-scripts
          - name: talos-config
            secret:
              secretName: talos-credentials
          restartPolicy: OnFailure
```

## Configuring Velero with Multiple Backup Locations

Velero can write to multiple backup storage locations, enabling direct cross-region backups.

```bash
# Primary backup location
velero backup-location create primary \
  --provider aws \
  --bucket talos-backups-primary \
  --config region=us-east-1 \
  --default

# Secondary backup location in another region
velero backup-location create secondary \
  --provider aws \
  --bucket talos-backups-replica \
  --config region=eu-west-1
```

Create backups that write to both locations:

```bash
# Primary backup runs on schedule
velero schedule create primary-daily \
  --schedule="0 2 * * *" \
  --storage-location primary \
  --ttl 720h

# Mirror important backups to the secondary location
velero backup create cross-region-backup \
  --storage-location secondary \
  --include-namespaces production
```

## Using MinIO with Multi-Site Replication

For on-premises deployments, MinIO supports site-to-site replication across data centers.

```bash
# Set up MinIO alias for each site
mc alias set site-a http://minio-site-a:9000 admin password
mc alias set site-b http://minio-site-b:9000 admin password

# Create buckets on both sites
mc mb site-a/talos-backups
mc mb site-b/talos-backups

# Enable replication from site-a to site-b
mc replicate add site-a/talos-backups \
  --remote-bucket site-b/talos-backups \
  --replicate "delete,delete-marker,existing-objects"
```

## Backing Up Machine Configurations

Store Talos machine configs alongside etcd snapshots.

```bash
#!/bin/bash
# backup-talos-configs.sh

BUCKET="s3://talos-backups-primary/machine-configs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Export configs for all nodes
for node in 10.0.1.10 10.0.1.11 10.0.1.12 10.0.2.10 10.0.2.11; do
  CONFIG_FILE="/tmp/config-${node}-${TIMESTAMP}.yaml"
  talosctl -n $node get machineconfig -o yaml > "$CONFIG_FILE"
  aws s3 cp "$CONFIG_FILE" "${BUCKET}/${node}/${TIMESTAMP}.yaml"
  rm -f "$CONFIG_FILE"
done

# Also back up the talosconfig (client credentials)
aws s3 cp ~/.talos/config "${BUCKET}/talosconfig/${TIMESTAMP}.yaml"
```

## Verifying Cross-Region Backups

Replication is only useful if the replicated data is valid. Set up verification checks.

```bash
#!/bin/bash
# verify-cross-region.sh

PRIMARY_BUCKET="talos-backups-primary"
REPLICA_BUCKET="talos-backups-replica"

# Compare object counts
PRIMARY_COUNT=$(aws s3 ls s3://${PRIMARY_BUCKET}/etcd-snapshots/ --recursive | wc -l)
REPLICA_COUNT=$(aws s3 ls s3://${REPLICA_BUCKET}/etcd-snapshots/ --recursive --region eu-west-1 | wc -l)

echo "Primary objects: $PRIMARY_COUNT"
echo "Replica objects: $REPLICA_COUNT"

if [ "$PRIMARY_COUNT" -ne "$REPLICA_COUNT" ]; then
  echo "WARNING: Object counts do not match. Replication may be lagging."
fi

# Verify latest snapshot can be downloaded from replica
LATEST=$(aws s3 ls s3://${REPLICA_BUCKET}/etcd-snapshots/ --region eu-west-1 | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://${REPLICA_BUCKET}/etcd-snapshots/${LATEST}" /tmp/verify-snapshot --region eu-west-1

if [ -s /tmp/verify-snapshot ]; then
  echo "Latest replica snapshot verified: $LATEST"
else
  echo "ERROR: Could not download or verify replica snapshot"
fi

rm -f /tmp/verify-snapshot
```

## Recovery from a Secondary Region

When the primary region is down, here is how to recover using cross-region backups:

```bash
# Step 1: Download etcd snapshot from the replica region
aws s3 cp s3://talos-backups-replica/etcd-snapshots/latest.snapshot \
  ./recovery-snapshot.snapshot --region eu-west-1

# Step 2: Download machine configs
aws s3 cp s3://talos-backups-replica/machine-configs/ ./configs/ \
  --recursive --region eu-west-1

# Step 3: Provision new nodes in the secondary region
# (Use Terraform, Pulumi, or manual provisioning)

# Step 4: Bootstrap the cluster with the recovered snapshot
talosctl apply-config --insecure --nodes NEW_NODE_IP --file ./configs/controlplane.yaml
talosctl bootstrap --recover-from=./recovery-snapshot.snapshot --nodes NEW_NODE_IP

# Step 5: Restore Velero backups
velero restore create --from-backup latest-backup \
  --storage-location secondary
```

## Conclusion

Cross-region backups for Talos Linux clusters require coordination between multiple backup mechanisms: etcd snapshots, machine configurations, and Kubernetes workload backups via Velero. By leveraging S3 cross-region replication or MinIO site replication, you can ensure that all these backup artifacts are available in a secondary location. Test your cross-region recovery process regularly to make sure the replicated data is usable. The extra effort of setting up cross-region backups is worth it when a regional outage hits and you need to recover quickly.
