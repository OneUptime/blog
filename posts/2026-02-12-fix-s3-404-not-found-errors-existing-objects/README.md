# How to Fix S3 '404 Not Found' Errors for Existing Objects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Troubleshooting, Cloud Storage

Description: Debug and fix S3 404 Not Found errors when objects definitely exist, covering eventual consistency, key naming, versioning, and replication issues.

---

You uploaded a file to S3. You know it's there. You've even confirmed it with `aws s3 ls`. But when you try to access it, you get a 404 Not Found. It's enough to make you question reality.

This problem is more common than you'd think, and it usually comes down to one of a handful of causes. Let's walk through each one.

## Cause 1: Wrong Key Name or Path

This sounds obvious, but it catches people all the time. S3 keys are case-sensitive, and even a small difference in path or encoding will result in a 404.

```bash
# These are ALL different keys in S3:
# photos/My File.jpg
# photos/my file.jpg
# photos/My%20File.jpg
# photos/my+file.jpg
```

Check exactly what key was stored:

```bash
# List objects with the exact prefix to see what's really there
aws s3api list-objects-v2 \
  --bucket my-bucket \
  --prefix "photos/" \
  --query 'Contents[*].Key'
```

Common mistakes include:

- Leading slashes: `photos/cat.jpg` vs `/photos/cat.jpg` (the second one has a literal `/` as the first character)
- URL encoding: spaces might be `%20` or `+` depending on how you uploaded
- Trailing whitespace in the key name
- Different path separators

### URL Encoding Issues in Web Requests

If you're accessing S3 objects through a URL, make sure the key is properly URL-encoded:

```python
import urllib.parse

# The object key in S3
key = "reports/Q1 2024/sales data.csv"

# URL-encode the key for use in a URL
encoded_key = urllib.parse.quote(key, safe='/')
print(f"https://my-bucket.s3.amazonaws.com/{encoded_key}")
# Output: https://my-bucket.s3.amazonaws.com/reports/Q1%202024/sales%20data.csv
```

## Cause 2: Wrong Region

S3 buckets exist in a specific region, and while most modern requests are automatically routed correctly, some older-style URLs and SDKs don't handle this well.

```bash
# Check which region your bucket is in
aws s3api get-bucket-location --bucket my-bucket
```

If the output says `null`, the bucket is in `us-east-1`. Otherwise it shows the region name.

Make sure your requests target the correct region:

```bash
# Wrong - using global endpoint might not work for non-us-east-1 buckets
curl https://my-bucket.s3.amazonaws.com/my-file.txt

# Correct - use the region-specific endpoint
curl https://my-bucket.s3.us-west-2.amazonaws.com/my-file.txt
```

## Cause 3: Versioning and Delete Markers

If your bucket has versioning enabled, a "deleted" object isn't really gone - S3 places a delete marker on top of it. The object still exists in previous versions, but a regular GET request will return 404.

```bash
# Check if versioning is enabled
aws s3api get-bucket-versioning --bucket my-bucket

# List object versions including delete markers
aws s3api list-object-versions \
  --bucket my-bucket \
  --prefix "my-file.txt" \
  --query '{Versions:Versions[*].{Key:Key,VersionId:VersionId,IsLatest:IsLatest},DeleteMarkers:DeleteMarkers[*].{Key:Key,VersionId:VersionId,IsLatest:IsLatest}}'
```

If you see a delete marker as the latest version, that's your problem. To restore the object, delete the delete marker:

```bash
# Get the delete marker's version ID from the command above
aws s3api delete-object \
  --bucket my-bucket \
  --key "my-file.txt" \
  --version-id "DELETE_MARKER_VERSION_ID"
```

This removes the delete marker, making the previous version the current one again.

## Cause 4: Cross-Region Replication Lag

If you're using S3 Cross-Region Replication, newly uploaded objects might not be available in the destination bucket immediately. Replication is asynchronous and can take anywhere from seconds to several minutes.

```bash
# Check replication status of a specific object
aws s3api head-object \
  --bucket my-source-bucket \
  --key "my-file.txt" \
  --query 'ReplicationStatus'
```

Possible values:
- `COMPLETED` - Successfully replicated
- `PENDING` - Still replicating
- `FAILED` - Replication failed
- `REPLICA` - This is the replica copy

If status is `PENDING`, just wait. If it's `FAILED`, check the replication configuration and IAM permissions.

## Cause 5: Requester Pays Bucket

If the bucket is configured as Requester Pays and you don't include the proper header, you'll get a 403 or 404.

```bash
# Check if the bucket uses requester pays
aws s3api get-bucket-request-payment --bucket my-bucket

# Access an object in a requester-pays bucket
aws s3api get-object \
  --bucket my-bucket \
  --key "my-file.txt" \
  --request-payer requester \
  outfile.txt
```

## Cause 6: Bucket Policy Masking as 404

Here's a tricky one. If you don't have `s3:ListBucket` permission on the bucket, S3 returns a 404 instead of 403 when an object doesn't exist (or when you don't have permission to it). This is a security feature - AWS doesn't want to reveal whether objects exist to unauthorized users.

So your "404" might actually be a permissions issue in disguise. Check if you have the right permissions:

```bash
# Test if you can list the bucket
aws s3api list-objects-v2 --bucket my-bucket --max-keys 1

# If this fails with Access Denied, the 404 is actually a permissions issue
```

If listing fails, the fix is to add `s3:ListBucket` to your IAM policy. See our guide on [fixing S3 403 Access Denied errors](https://oneuptime.com/blog/post/2026-02-12-fix-s3-403-access-denied-errors/view) for more details.

## Cause 7: Static Website Hosting Configuration

If you're using S3 for static website hosting, the website endpoint behaves differently from the REST API endpoint.

```bash
# REST API endpoint (returns XML errors)
https://my-bucket.s3.amazonaws.com/page.html

# Website endpoint (returns HTML errors, follows redirect rules)
https://my-bucket.s3-website-us-east-1.amazonaws.com/page.html
```

The website endpoint respects the index document and error document settings, while the REST API endpoint doesn't. If you're expecting `index.html` to load when accessing a "folder," you need to use the website endpoint.

```bash
# Check the website configuration
aws s3api get-bucket-website --bucket my-bucket
```

## Debugging Script

Here's a script that runs through the most common 404 causes:

```bash
BUCKET="my-bucket"
KEY="my-file.txt"

echo "=== Checking bucket location ==="
aws s3api get-bucket-location --bucket $BUCKET

echo "=== Checking if object exists ==="
aws s3api head-object --bucket $BUCKET --key "$KEY" 2>&1

echo "=== Checking versioning ==="
aws s3api get-bucket-versioning --bucket $BUCKET

echo "=== Checking for delete markers ==="
aws s3api list-object-versions \
  --bucket $BUCKET --prefix "$KEY" --max-keys 5

echo "=== Listing objects with similar prefix ==="
PREFIX=$(echo "$KEY" | cut -d'/' -f1)
aws s3api list-objects-v2 \
  --bucket $BUCKET --prefix "$PREFIX/" --max-keys 20 \
  --query 'Contents[*].Key'

echo "=== Checking requester pays ==="
aws s3api get-bucket-request-payment --bucket $BUCKET
```

## Prevention Tips

1. Use consistent naming conventions for S3 keys - stick to lowercase and hyphens
2. Always verify the key after upload with `head-object`
3. Log all 404 errors and monitor for spikes using a tool like [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view)
4. Enable S3 access logging to track failed requests
5. Be careful with URL encoding when building S3 URLs programmatically

Most S3 404 errors come down to key name mismatches or versioning/delete marker issues. Start your debugging there and you'll solve the majority of cases quickly.
