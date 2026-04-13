# How to Terminate Atlas Clusters Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Cluster, Termination, Data Protection

Description: Safely terminate MongoDB Atlas clusters by backing up data, verifying no active connections, and using the Atlas CLI or Admin API with proper safeguards.

---

## Overview

Terminating an Atlas cluster is irreversible and immediately destroys all data if backups are not configured. A safe termination procedure includes exporting a final backup, verifying the cluster is no longer needed, and using the Atlas CLI or Admin API to perform the deletion.

## Pre-Termination Checklist

Before terminating a cluster, verify the following:

```text
1. All application connections have been redirected to a new cluster or shut down.
2. A final backup or export has been taken.
3. The cluster is confirmed to be a dev/test environment, not production.
4. No scheduled tasks or cron jobs reference this cluster's connection string.
5. The project's Atlas Triggers and Functions are not connected to this cluster.
```

## Taking a Final Backup with mongodump

```bash
# Export the database before termination
mongodump \
  --uri "mongodb+srv://user:password@cluster.mongodb.net/myapp" \
  --out /backup/$(date +%Y%m%d)-final-dump

# Compress the dump
tar -czf /backup/$(date +%Y%m%d)-final-dump.tar.gz \
  /backup/$(date +%Y%m%d)-final-dump

# Verify the archive
tar -tzf /backup/$(date +%Y%m%d)-final-dump.tar.gz | head -20
```

## Checking for Active Connections

Check for active connections before terminating.

```bash
# Connect and check active connections
mongosh "mongodb+srv://user:password@cluster.mongodb.net/admin" \
  --eval 'db.currentOp(true).inprog.filter(op => op.active).length + " active operations"'
```

## Terminating a Cluster with the Atlas CLI

```bash
# List clusters to confirm the target
atlas clusters list --projectId <PROJECT_ID>

# Delete the cluster (prompts for confirmation)
atlas clusters delete my-dev-cluster --projectId <PROJECT_ID>

# Delete without prompting (use with care in automation)
atlas clusters delete my-dev-cluster --projectId <PROJECT_ID> --force
```

## Terminating via the Admin API

```bash
PUBLIC_KEY="your-public-key"
PRIVATE_KEY="your-private-key"
PROJECT_ID="your-project-id"
CLUSTER_NAME="my-dev-cluster"

curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --request DELETE \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/clusters/${CLUSTER_NAME}"
```

The API returns HTTP 202 Accepted. The cluster enters `DELETING` state and cannot be recovered after this point.

## Verifying Deletion

```bash
# Poll until the cluster no longer appears in the list
while atlas clusters describe ${CLUSTER_NAME} --projectId ${PROJECT_ID} &>/dev/null; do
  echo "Cluster still deleting..."
  sleep 30
done
echo "Cluster deleted"
```

## Deleting the Project After Cluster Termination

Once all clusters are deleted, you can optionally delete the project.

```bash
# Verify no clusters remain
atlas clusters list --projectId <PROJECT_ID>

# Delete the project
atlas projects delete <PROJECT_ID> --force
```

## Using Terraform to Manage Termination

If the cluster was provisioned with Terraform, destroy it through Terraform to maintain state consistency.

```bash
# Destroy only the cluster resource, not the whole project
terraform destroy -target=mongodbatlas_cluster.dev_cluster
```

## Termination Protection

Enable termination protection on production clusters to prevent accidental deletion.

```bash
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Content-Type: application/json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/clusters/production-cluster" \
  --data '{"terminationProtectionEnabled": true}'
```

## Summary

Safely terminating an Atlas cluster requires a final `mongodump` backup, verification that all application connections and scheduled jobs have been removed, and confirmation the cluster is not production. Use `terminationProtectionEnabled: true` on production clusters as a safeguard against accidental deletion, and always prefer Terraform destroy over manual deletion when the cluster was infrastructure-as-code provisioned.
