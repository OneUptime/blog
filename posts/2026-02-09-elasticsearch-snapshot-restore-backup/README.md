# How to set up Elasticsearch snapshot and restore for backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Backup, Snapshot, Disaster Recovery, EFK Stack

Description: Configure Elasticsearch snapshot and restore functionality with S3, GCS, or Azure storage for automated backups, disaster recovery, and cluster migration strategies.

---

Elasticsearch snapshots provide point-in-time backups of your cluster data, enabling disaster recovery, cluster migration, and data archival. Properly configured snapshots protect against data loss from hardware failures, accidental deletions, or cluster corruption while supporting compliance requirements for data retention.

This guide covers setting up snapshot repositories, creating automated backup policies, and implementing restore procedures for Kubernetes-based Elasticsearch clusters.

## Understanding Elasticsearch snapshots

Snapshots capture cluster state and index data:
- Incremental backups (only changed data)
- Support for multiple storage backends
- Minimal performance impact during creation
- Restore entire cluster or specific indices
- Cross-cluster restore capability

Snapshots are stored in repositories on shared storage like S3, GCS, Azure Blob, or NFS.

## Configuring S3 snapshot repository

Set up AWS S3 for snapshots:

```bash
# Install repository-s3 plugin (usually pre-installed)
kubectl exec -it elasticsearch-master-0 -n logging -- \
  bin/elasticsearch-plugin install repository-s3

# Restart nodes after plugin installation
kubectl rollout restart statefulset elasticsearch-master -n logging

# Add S3 credentials
kubectl exec -it elasticsearch-master-0 -n logging -- \
  bin/elasticsearch-keystore add s3.client.default.access_key

kubectl exec -it elasticsearch-master-0 -n logging -- \
  bin/elasticsearch-keystore add s3.client.default.secret_key

# Register S3 repository
curl -X PUT "https://elasticsearch.logging.svc:9200/_snapshot/s3_backup?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "s3",
    "settings": {
      "bucket": "elasticsearch-snapshots",
      "region": "us-east-1",
      "base_path": "kubernetes-logs",
      "compress": true,
      "max_snapshot_bytes_per_sec": "40mb",
      "max_restore_bytes_per_sec": "40mb"
    }
  }'
```

## Creating manual snapshots

Create one-time snapshots:

```bash
# Snapshot all indices
curl -X PUT "https://elasticsearch.logging.svc:9200/_snapshot/s3_backup/snapshot-$(date +%Y%m%d-%H%M%S)?wait_for_completion=false&pretty" \
  -u elastic:$ELASTIC_PASSWORD

# Snapshot specific indices
curl -X PUT "https://elasticsearch.logging.svc:9200/_snapshot/s3_backup/kubernetes-snapshot?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "kubernetes-*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'
```

## Implementing automated snapshot policies

Create snapshot lifecycle management policy:

```bash
curl -X PUT "https://elasticsearch.logging.svc:9200/_slm/policy/daily-snapshots?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "schedule": "0 2 * * *",
    "name": "<daily-snap-{now/d}>",
    "repository": "s3_backup",
    "config": {
      "indices": ["*"],
      "ignore_unavailable": false,
      "include_global_state": true
    },
    "retention": {
      "expire_after": "30d",
      "min_count": 7,
      "max_count": 30
    }
  }'
```

## Restoring from snapshots

Restore entire cluster or specific indices:

```bash
# List available snapshots
curl "https://elasticsearch.logging.svc:9200/_snapshot/s3_backup/_all?pretty" \
  -u elastic:$ELASTIC_PASSWORD

# Restore specific indices
curl -X POST "https://elasticsearch.logging.svc:9200/_snapshot/s3_backup/snapshot-20260209/_restore?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "kubernetes-2026.02.09",
    "ignore_unavailable": true,
    "include_global_state": false,
    "rename_pattern": "kubernetes-(.*)",
    "rename_replacement": "restored-kubernetes-$1"
  }'

# Monitor restore progress
curl "https://elasticsearch.logging.svc:9200/_cat/recovery?v" \
  -u elastic:$ELASTIC_PASSWORD
```

## Best practices

1. **Test restores regularly:** Validate backup integrity
2. **Use separate storage:** Store snapshots in different region/account
3. **Implement retention policies:** Balance storage costs with recovery needs
4. **Monitor snapshot status:** Alert on snapshot failures
5. **Set appropriate throttling:** Limit network bandwidth impact
6. **Document procedures:** Maintain runbooks for disaster recovery
7. **Encrypt snapshots:** Use server-side encryption for sensitive data
8. **Verify completion:** Check snapshot status after creation

## Conclusion

Elasticsearch snapshots provide essential protection for your log data, enabling disaster recovery, compliance, and cluster migration. By configuring automated snapshot policies with proper retention, storage backends, and tested restore procedures, you ensure your Kubernetes logs are protected against data loss and can be recovered quickly when needed.
