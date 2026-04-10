# How to Configure Bucket Lifecycle Rules in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Object Storage, Lifecycle, RGW

Description: Learn how to configure S3-compatible bucket lifecycle rules in Ceph RGW to automate object expiration, transitions, and cleanup policies.

---

## What Are Bucket Lifecycle Rules?

Ceph RGW supports S3-compatible bucket lifecycle policies that let you automatically expire objects, delete incomplete multipart uploads, and transition objects based on age or prefix filters. This reduces manual cleanup effort and controls storage growth.

## Prerequisites

- A running Ceph cluster with RGW enabled
- `radosgw-admin` CLI access or S3-compatible client (AWS CLI configured against RGW)
- Bucket already created

## Configuring Lifecycle Rules via AWS CLI

The easiest way to apply lifecycle rules is using the AWS CLI pointed at your RGW endpoint.

First, configure your CLI to target RGW:

```bash
aws configure set default.s3.endpoint_url http://rgw.example.com:7480
aws configure set aws_access_key_id <access_key>
aws configure set aws_secret_access_key <secret_key>
```

Create a lifecycle policy JSON file:

```json
{
  "Rules": [
    {
      "ID": "expire-old-logs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "cleanup-incomplete-uploads",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

Apply the policy to a bucket:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json \
  --endpoint-url http://rgw.example.com:7480
```

## Verifying Lifecycle Configuration

Confirm the rules were applied:

```bash
aws s3api get-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --endpoint-url http://rgw.example.com:7480
```

## Checking Lifecycle Processing

RGW processes lifecycle rules via a background job. Check when it last ran:

```bash
radosgw-admin lc list
radosgw-admin lc get --bucket my-bucket
```

Force an immediate lifecycle processing run (useful for testing):

```bash
radosgw-admin lc process
```

## Adjusting the Lifecycle Worker Interval

By default, RGW checks lifecycle rules once per day. You can tune this in your RGW config:

```ini
[client.rgw.myzone]
rgw_lifecycle_work_time = 00:00-06:00
rgw_lc_max_objs = 32
```

Restart the daemon after changes:

```bash
systemctl restart ceph-radosgw@rgw.myzone
```

## Summary

Ceph RGW supports S3-compatible bucket lifecycle rules that automate object expiration and multipart upload cleanup. Use `aws s3api put-bucket-lifecycle-configuration` to apply rules, then verify with `radosgw-admin lc get`. Adjust the worker schedule via RGW config keys to control when processing occurs.
