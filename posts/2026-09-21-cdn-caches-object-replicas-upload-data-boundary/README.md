# How to Keep CDN Caches, Object Replicas, and Uploads Within a Data Boundary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, AWS CloudFront, Amazon S3, Data Processing, Security

Description: Audit CDN processing, S3 replication destinations, upload workers, and derived artifacts so object delivery does not silently cross an approved data boundary.

---

A regional object bucket does not make the entire upload and delivery pipeline regional. A CDN may cache its responses globally, a malware scanner may process uploads elsewhere, and generated thumbnails may land in a second bucket.

Follow one object through ingestion, processing, delivery, retention, and deletion. Treat every intermediate representation as a copy until its data classification says otherwise.

## Separate public assets from customer content

Static application assets often have different placement requirements from uploaded documents or private exports. Give them separate origins, cache behaviors, storage paths, and processing jobs. This makes the controls reviewable without requiring every public JavaScript file to follow the same policy as a customer's financial report.

For sensitive content, determine whether the requirement covers storage, processing, transit, remote access, or all four. The correct delivery design depends on that distinction.

## Do not confuse viewer restrictions with cache placement

CloudFront [geographic restrictions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/georestrictions.html) restrict access based on viewer location. They do not promise that content is processed or cached only inside that viewer's country.

CloudFront's [delivery architecture](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html) includes edge locations and regional edge caches. A regional origin is therefore only one part of the content path. A price class or a signed URL is also not evidence of a hard residency boundary.

When a requirement prohibits edge processing outside a location set, use a provider feature with an explicit applicable location commitment or serve the sensitive path through an approved regional delivery architecture. Document the performance and availability tradeoff.

## Check caching controls at the effective behavior

For content that should never be retained in intermediary caches, set appropriate origin response headers and inspect the cache policy on the matching CDN behavior together. A CloudFront response headers policy changes viewer response headers but does not control CloudFront caching. CloudFront documents that a positive minimum TTL can cause caching even when the origin sends `no-cache`, `no-store`, or `private`. See [expiration controls](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html).

Disabling caching still does not remove edge processing or network transit. It only addresses one storage path. Previously cached objects may also need invalidation or expiration; changing a future caching policy is not proof that old copies disappeared.

Test authenticated and unauthenticated responses, errors, redirects, range requests, and generated download links. Confirm that a private response cannot be reused across tenants.

## Resolve every object-replication destination

S3 supports both [same-region and cross-region replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html). A destination bucket ARN does not contain its region, so resolve the destination bucket rather than inferring location from its name.

For a general-purpose bucket:

```bash
aws s3api get-bucket-replication \
  --bucket REPLACE_WITH_SOURCE_BUCKET \
  --output json

aws s3api get-bucket-location \
  --bucket REPLACE_WITH_DESTINATION_BUCKET \
  --output json
```

Inspect every enabled rule and destination. An absent replication configuration is different from an access-denied or failed request; do not treat all command failures as "no replication."

The [bucket-location reference](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-location.html) defines legacy values: `null` means `us-east-1` and `EU` means `eu-west-1`. It recommends HeadBucket for current region discovery. Include cross-account buckets in the audit through an authorized inventory path; unknown location should block approval.

Also search batch replication jobs, copy scripts, lifecycle archives, backup tools, and third-party integrations. Native live-replication settings are not a complete copy inventory.

## Keep upload processing within the same approved path

Record the locations of the upload endpoint, temporary multipart storage, event queue, workers, scratch volumes, scanners, OCR services, preview generators, and output buckets. A worker in the correct region can still call an external processing API.

Use object references in job messages rather than full documents where practical. Keep those references free of customer names, and give workers only the permissions required for the approved input and output stores. Review dead-letter queues and job-error attachments.

For direct uploads, create signed upload requests for the intended regional service and resource. Ensure the signing service cannot select an arbitrary destination from untrusted user input.

## Verify with a synthetic object

Upload a synthetic document carrying a unique marker. Capture its input bucket, event route, worker execution region, derived objects, and delivery behavior. Exercise upload failure, retries, scanner rejection, and recovery from a dead-letter queue.

Then delete the test object and check versioned copies, derived artifacts, and caches according to the deletion design. Retain evidence about locations and identifiers without embedding the document itself in a global test report.

Approve the pipeline only when every required location is known and allowed. A single unknown scanner, cache, or replica is an unresolved data path, even when the original bucket is configured correctly.
