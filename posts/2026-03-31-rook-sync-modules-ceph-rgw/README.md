# How to Configure Sync Modules for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Sync, Multisite, Object Storage, Replication

Description: Learn how to configure and use Ceph RGW sync modules to customize data replication behavior in multisite deployments.

---

Ceph RGW sync modules extend the multisite replication framework to allow custom handling of data as it is replicated between zones. Instead of simply copying objects, sync modules can forward data to external systems, archive it, or apply transformations.

## Built-in Sync Module Types

Ceph RGW ships with several sync module types:

- `default`: Standard object replication between zones
- `archive`: Retains object history indefinitely (even after deletion)
- `cloud-s3`: Replicates data to an external S3-compatible target
- `elasticsearch`: Indexes object metadata into Elasticsearch

> **Note:** The `pubsub` sync module was removed in Ceph Pacific (v16). Use bucket notifications to publish object events to AMQP, Kafka, or HTTP endpoints.

## Setting Up a Zone with an Archive Sync Module

Create a zone group and zone that uses the archive module to preserve all object versions:

```bash
# Create zone group
radosgw-admin zonegroup create \
  --rgw-zonegroup us \
  --endpoints http://primary-rgw:7480 \
  --master --default

# Create primary zone
radosgw-admin zone create \
  --rgw-zonegroup us \
  --rgw-zone us-east-1 \
  --master --default \
  --endpoints http://primary-rgw:7480

# Create archive zone
radosgw-admin zone create \
  --rgw-zonegroup us \
  --rgw-zone us-archive \
  --sync-from us-east-1 \
  --tier-type archive \
  --endpoints http://archive-rgw:7480
```

## Configuring a Cloud-S3 Sync Module

To replicate objects to an external S3 bucket (e.g., AWS):

```bash
# Create a cloud sync zone
radosgw-admin zone create \
  --rgw-zonegroup us \
  --rgw-zone cloud-backup \
  --tier-type cloud-s3 \
  --endpoints http://cloud-rgw:7480

# Configure the external S3 endpoint
radosgw-admin zone modify \
  --rgw-zone cloud-backup \
  --tier-config=connection.endpoint=https://s3.amazonaws.com,\
connection.access_key=AKIAIOSFODNN7EXAMPLE,\
connection.secret=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY,\
target_path=my-aws-backup-bucket
```

## Configuring Bucket Notifications

> **Note:** The `pubsub` sync module was removed in Ceph Pacific (v16). Bucket notifications are the standard way to publish object events to AMQP, Kafka, or HTTP endpoints.

Use the SNS-compatible API to create a topic and configure bucket notifications:

```bash
# Create an SNS topic with an AMQP endpoint
aws --endpoint-url http://rgw:7480 sns create-topic \
  --name rgw-events \
  --attributes '{"push-endpoint":"amqp://rabbitmq.example.com","amqp-exchange":"rgw-events"}'

# Configure bucket notifications
aws --endpoint-url http://rgw:7480 s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration '{
    "TopicConfigurations": [{
      "TopicArn": "arn:aws:sns:default::rgw-events",
      "Events": ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    }]
  }'
```

## Verifying Sync Status

Check the sync status between zones:

```bash
radosgw-admin sync status
```

For a specific zone:

```bash
radosgw-admin sync status --rgw-zone us-archive
```

## Updating Period After Changes

After any zone or zonegroup changes, commit the period:

```bash
radosgw-admin period update --commit
```

## Summary

Ceph RGW sync modules allow you to customize what happens when objects are replicated across zones. Use the archive module for immutable history, the cloud-s3 module to offload to public cloud, or bucket notifications to stream events to message brokers. Always commit the period after configuration changes to propagate them across the cluster.
