# Setting Up Elasticsearch Snapshot and Restore with S3-Compatible Storage on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elasticsearch, Snapshot, S3, Kubernetes, Backup

Description: A comprehensive guide to configuring Elasticsearch snapshot and restore workflows using S3-compatible object storage on Kubernetes clusters for reliable backup and disaster recovery.

---

Elasticsearch is one of the most widely deployed search and analytics engines in production environments. When running Elasticsearch on Kubernetes, implementing a robust backup and restore strategy is not optional. Losing an index due to node failure, accidental deletion, or cluster corruption without a backup can be catastrophic. This guide walks through setting up Elasticsearch snapshot and restore using S3-compatible storage on Kubernetes, covering everything from plugin installation to automated snapshot lifecycle management.

## Why S3-Compatible Storage for Elasticsearch Snapshots

S3-compatible object storage has become the de facto standard for backups. Whether you use AWS S3, MinIO, Ceph Object Gateway, or DigitalOcean Spaces, the S3 API is universally supported. For Elasticsearch snapshots, S3 storage provides durability, cost efficiency, and decoupling from the cluster itself. If your entire Kubernetes cluster goes down, your snapshots remain safe in object storage.

## Prerequisites

Before proceeding, ensure you have the following:

- A running Elasticsearch cluster on Kubernetes (we will use the Elastic Cloud on Kubernetes operator, ECK)
- An S3-compatible bucket created and accessible
- Access credentials (access key and secret key) for the S3 bucket
- kubectl configured to interact with your cluster

## Step 1: Deploy Elasticsearch with the Repository S3 Plugin

If you are using ECK, you can specify the S3 repository plugin in your Elasticsearch custom resource. The plugin must be installed on every node in the cluster.

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: my-elasticsearch
  namespace: elastic-system
spec:
  version: 8.12.0
  nodeSets:
    - name: default
      count: 3
      config:
        node.store.allow_mmap: false
      podTemplate:
        spec:
          initContainers:
            - name: install-plugins
              command:
                - sh
                - -c
                - |
                  bin/elasticsearch-plugin install --batch repository-s3
```

This init container runs before Elasticsearch starts and installs the `repository-s3` plugin. The `--batch` flag suppresses interactive prompts.

## Step 2: Create a Kubernetes Secret for S3 Credentials

Elasticsearch needs credentials to access your S3 bucket. Store these in a Kubernetes secret and inject them into the Elasticsearch keystore.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: s3-credentials
  namespace: elastic-system
type: Opaque
stringData:
  s3.client.default.access_key: "YOUR_ACCESS_KEY"
  s3.client.default.secret_key: "YOUR_SECRET_KEY"
```

Apply the secret:

```bash
kubectl apply -f s3-credentials.yaml
```

Now reference this secret in the Elasticsearch spec so it gets loaded into the keystore:

```yaml
spec:
  secureSettings:
    - secretName: s3-credentials
```

After applying the updated Elasticsearch resource, ECK will automatically reload the keystore. You can verify the keystore entries by exec-ing into a pod:

```bash
kubectl exec -it my-elasticsearch-es-default-0 -n elastic-system -- \
  bin/elasticsearch-keystore list
```

You should see `s3.client.default.access_key` and `s3.client.default.secret_key` in the output.

## Step 3: Configure the S3 Client Endpoint

If you are using a non-AWS S3-compatible service like MinIO, you need to configure a custom endpoint. Add the following to your Elasticsearch configuration:

```yaml
config:
  s3.client.default.endpoint: "minio.minio-system.svc.cluster.local:9000"
  s3.client.default.protocol: "http"
  s3.client.default.path_style_access: true
```

For AWS S3, you can skip custom endpoint configuration. The default client settings will use the standard AWS endpoints. If your bucket is in a specific region, set:

```yaml
config:
  s3.client.default.region: "us-west-2"
```

## Step 4: Register a Snapshot Repository

Once the plugin is installed and credentials are configured, register a snapshot repository using the Elasticsearch API. You can do this through a port-forward or a Kubernetes Job.

```bash
kubectl port-forward svc/my-elasticsearch-es-http 9200:9200 -n elastic-system
```

Then register the repository:

```bash
curl -k -u "elastic:$(kubectl get secret my-elasticsearch-es-elastic-user \
  -n elastic-system -o jsonpath='{.data.elastic}' | base64 -d)" \
  -X PUT "https://localhost:9200/_snapshot/s3_backup" \
  -H 'Content-Type: application/json' -d '{
    "type": "s3",
    "settings": {
      "bucket": "elasticsearch-snapshots",
      "base_path": "backups/production",
      "compress": true,
      "chunk_size": "500mb",
      "max_restore_bytes_per_sec": "200mb",
      "max_snapshot_bytes_per_sec": "200mb"
    }
  }'
```

The `compress` setting enables metadata compression. The `chunk_size` setting splits large files into manageable chunks, which is important for network reliability. The throughput settings prevent snapshots from saturating your network bandwidth.

Verify the repository:

```bash
curl -k -u "elastic:$PASSWORD" \
  "https://localhost:9200/_snapshot/s3_backup/_verify"
```

A successful verification confirms that every node in the cluster can access the S3 bucket.

## Step 5: Create a Manual Snapshot

To create a snapshot of all indices:

```bash
curl -k -u "elastic:$PASSWORD" \
  -X PUT "https://localhost:9200/_snapshot/s3_backup/snapshot_$(date +%Y%m%d_%H%M%S)?wait_for_completion=false" \
  -H 'Content-Type: application/json' -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": true
  }'
```

Setting `wait_for_completion` to false makes the call return immediately. You can monitor progress with:

```bash
curl -k -u "elastic:$PASSWORD" \
  "https://localhost:9200/_snapshot/s3_backup/_current"
```

To snapshot specific indices only:

```bash
curl -k -u "elastic:$PASSWORD" \
  -X PUT "https://localhost:9200/_snapshot/s3_backup/snapshot_logs_only" \
  -H 'Content-Type: application/json' -d '{
    "indices": "logs-*,metrics-*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'
```

## Step 6: Automate Snapshots with Snapshot Lifecycle Management

Elasticsearch provides Snapshot Lifecycle Management (SLM) to automate the creation and retention of snapshots. This is far more reliable than relying on external CronJobs.

```bash
curl -k -u "elastic:$PASSWORD" \
  -X PUT "https://localhost:9200/_slm/policy/daily-snapshots" \
  -H 'Content-Type: application/json' -d '{
    "schedule": "0 30 2 * * ?",
    "name": "<daily-snap-{now/d}>",
    "repository": "s3_backup",
    "config": {
      "indices": ["*"],
      "ignore_unavailable": true,
      "include_global_state": true
    },
    "retention": {
      "expire_after": "30d",
      "min_count": 5,
      "max_count": 50
    }
  }'
```

This policy creates a snapshot every day at 2:30 AM, retains snapshots for 30 days, keeps at least 5 and at most 50 snapshots. The `{now/d}` date math in the name ensures unique snapshot names.

Check the SLM policy status:

```bash
curl -k -u "elastic:$PASSWORD" \
  "https://localhost:9200/_slm/policy/daily-snapshots"
```

You can also trigger a policy manually for testing:

```bash
curl -k -u "elastic:$PASSWORD" \
  -X POST "https://localhost:9200/_slm/policy/daily-snapshots/_execute"
```

## Step 7: Restore from a Snapshot

To restore all indices from a snapshot:

```bash
curl -k -u "elastic:$PASSWORD" \
  -X POST "https://localhost:9200/_snapshot/s3_backup/daily-snap-2026.02.09/_restore" \
  -H 'Content-Type: application/json' -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": false,
    "rename_pattern": "(.+)",
    "rename_replacement": "restored_$1"
  }'
```

The `rename_pattern` and `rename_replacement` fields are useful when you want to restore alongside existing indices. This prefixes restored indices with `restored_` to avoid conflicts.

To restore into a completely fresh cluster, omit the rename fields:

```bash
curl -k -u "elastic:$PASSWORD" \
  -X POST "https://localhost:9200/_snapshot/s3_backup/daily-snap-2026.02.09/_restore" \
  -H 'Content-Type: application/json' -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": true
  }'
```

## Troubleshooting Common Issues

**Repository verification fails**: Check that the S3 credentials are correct, the bucket exists, and network policies allow egress to the S3 endpoint. If using MinIO inside the cluster, ensure the service DNS resolves correctly.

**Snapshot is stuck in IN_PROGRESS**: This usually indicates a node that cannot write to S3. Check the Elasticsearch logs on each node. Look for `IOException` or `AmazonS3Exception` entries. Common causes include expired credentials, bucket policy restrictions, or network timeouts.

**Restore fails with index already exists**: Close or delete the existing index before restoring, or use the rename pattern approach shown above.

**Slow snapshot performance**: Increase `max_snapshot_bytes_per_sec` in the repository settings. Ensure your S3-compatible storage has sufficient IOPS and bandwidth. Consider using a regional endpoint to reduce latency.

## Security Considerations

Never store S3 credentials in plaintext in your Elasticsearch configuration files. Always use the Elasticsearch keystore mechanism, which encrypts secrets at rest. In ECK, the `secureSettings` approach handles this automatically.

If running on AWS, consider using IAM Roles for Service Accounts (IRSA) instead of static credentials. This eliminates the need for long-lived access keys entirely. Annotate the Elasticsearch service account with the IAM role ARN, and the S3 plugin will pick up temporary credentials from the instance metadata service.

## Conclusion

Setting up Elasticsearch snapshot and restore with S3-compatible storage on Kubernetes is a multi-step process, but each step is straightforward. The combination of the repository-s3 plugin, secure credential management through Kubernetes secrets, and Snapshot Lifecycle Management gives you a fully automated, production-grade backup solution. Test your restores regularly. A backup that has never been tested is not a backup. Schedule periodic restore drills to a staging environment to confirm that your snapshots are valid and your recovery procedures work under pressure.
