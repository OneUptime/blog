# How to Configure Cloud Sync Module for RGW to Azure Blob

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Azure, Cloud Sync

Description: Learn how to configure the Ceph RGW cloud sync module to replicate objects to Azure Blob Storage for hybrid cloud and disaster recovery use cases.

---

## Overview

Azure Blob Storage does not natively support the S3 API. To use the Ceph RGW cloud sync module with Azure, you need an S3-compatible proxy such as rclone to bridge between RGW and Azure Blob. This guide covers the configuration of the Azure sync target via a proxy and verification of object replication.

## Step 1 - Enable Azure Blob S3 Compatibility

Azure Blob natively supports NFS and REST APIs, but for S3 compatibility you need an intermediary. The recommended approach for Ceph cloud sync is to use the Azure Blob storage account with a compatibility layer or use rclone as a proxy.

```bash
# Option 1: Use rclone as an S3 proxy to Azure
# Install rclone on a proxy host
curl https://rclone.org/install.sh | bash

# Configure rclone for Azure Blob
rclone config create azureblob azureblob \
  account=my-storage-account \
  key=my-storage-account-key

# Start rclone as an S3 proxy
rclone serve s3 azureblob: \
  --addr 0.0.0.0:9000 \
  --auth-key fake-access-key,fake-secret-key \
  --no-modtime &
```

## Step 2 - Configure the Azure Cloud Sync Zone

```bash
# Create sync user and cloud zone
radosgw-admin user create --uid=azure-sync \
  --display-name="Azure Sync User" --system

SYNC_ACCESS=$(radosgw-admin user info --uid=azure-sync | jq -r '.keys[0].access_key')
SYNC_SECRET=$(radosgw-admin user info --uid=azure-sync | jq -r '.keys[0].secret_key')

# Create the cloud tier zone
radosgw-admin zone create \
  --rgw-zonegroup=default \
  --rgw-zone=azure-zone \
  --tier-type=cloud-s3 \
  --access-key="${SYNC_ACCESS}" \
  --secret="${SYNC_SECRET}"

# Point to the rclone S3 proxy fronting Azure
radosgw-admin zone modify \
  --rgw-zone=azure-zone \
  --tier-config=connection.id=azure-main,\
connection.endpoint=http://rclone-proxy.example.com:9000,\
connection.access_key=fake-access-key,\
connection.secret=fake-secret-key,\
connection.region=us-east-1,\
connection.host_style=path,\
target_path=ceph-to-azure-container

radosgw-admin period update --commit
```

## Step 3 - Direct Azure Blob REST API Integration

For a direct approach using Azure Blob's native REST API, use a custom sync module or the pubsub module with an Azure Function consumer:

```bash
# First create the SNS topic with the Azure Function push endpoint
aws --endpoint-url http://rgw.example.com:7480 \
  sns create-topic --name rgw-azure-topic \
  --attributes '{"push-endpoint":"https://your-azure-function.azurewebsites.net/api/sync"}'

# Configure bucket notifications to an Azure Function
aws --endpoint-url http://rgw.example.com:7480 \
  s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration '{
    "TopicConfigurations": [
      {
        "Id": "azure-sync",
        "TopicArn": "arn:aws:sns:::rgw-azure-topic",
        "Events": ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
      }
    ]
  }'
```

## Step 4 - Set Up Azure Function Consumer

```python
# azure_function_consumer.py
# Azure Function that receives RGW notifications and copies to Azure Blob

import azure.functions as func
import boto3
from azure.storage.blob import BlobServiceClient

def main(req: func.HttpRequest) -> func.HttpResponse:
    notification = req.get_json()
    for record in notification.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        event_type = record["eventName"]

        if "ObjectCreated" in event_type:
            copy_to_azure(bucket, key)
        elif "ObjectRemoved" in event_type:
            delete_from_azure(bucket, key)

    return func.HttpResponse("OK", status_code=200)

def copy_to_azure(bucket, key):
    s3 = boto3.client("s3",
        endpoint_url="http://rgw.example.com:7480",
        aws_access_key_id="access-key",
        aws_secret_access_key="secret-key")
    obj = s3.get_object(Bucket=bucket, Key=key)

    blob_client = BlobServiceClient.from_connection_string(
        "DefaultEndpointsProtocol=https;AccountName=myaccount;..."
    ).get_blob_client(container="ceph-backup", blob=f"{bucket}/{key}")
    blob_client.upload_blob(obj["Body"].read(), overwrite=True)

def delete_from_azure(bucket, key):
    blob_client = BlobServiceClient.from_connection_string(
        "DefaultEndpointsProtocol=https;AccountName=myaccount;..."
    ).get_blob_client(container="ceph-backup", blob=f"{bucket}/{key}")
    blob_client.delete_blob()
```

## Step 5 - Monitor the Sync

```bash
# Check sync status
radosgw-admin sync status --rgw-zone=azure-zone

# Verify objects in Azure
az storage blob list \
  --container-name ceph-to-azure-container \
  --account-name my-storage-account \
  --prefix "mybucket/" \
  --output table

# Check for sync errors
radosgw-admin sync error list --max-entries=20
```

## Step 6 - Handle Multipart Upload Compatibility

```bash
# Azure Blob supports multipart upload with specific size limits
# Configure thresholds for compatibility
radosgw-admin zone modify \
  --rgw-zone=azure-zone \
  --tier-config=multipart_sync_threshold=104857600,\
multipart_min_part_size=5242880,\
retain_head_object=false
```

## Summary

Ceph RGW cloud sync to Azure Blob Storage works best via an S3-compatible proxy layer such as rclone or a dedicated gateway, since Azure's native S3 compatibility is limited. Alternatively, the pubsub notification module with an Azure Function consumer provides an event-driven replication path. In both cases, monitoring sync status and errors through `radosgw-admin sync status` ensures reliable data replication.
