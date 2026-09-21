# Validation Summary: How to Keep CDN Caches, Object Replicas, and Uploads Within a Data Boundary

## Status
validated

## Post Type
Technical guide with AWS CLI commands and operational audit guidance.

## Technologies Covered
- Amazon CloudFront geographic restrictions, edge caches, cache policies, response headers policies, signed URLs, and invalidation.
- Amazon S3 replication, bucket region discovery, multipart uploads, presigned uploads, and object versioning.
- AWS CLI S3 API commands and IAM resource permissions.
- Upload processing pipelines, event notifications, derived artifacts, and data residency controls.

## Sources Consulted
- [CloudFront geographic restrictions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/georestrictions.html).
- [CloudFront delivery architecture](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html).
- [CloudFront FAQs, including price classes](https://aws.amazon.com/cloudfront/faqs/).
- [CloudFront signed URLs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html).
- [CloudFront cache expiration controls](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html).
- [CloudFront response headers policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html).
- [CloudFront error caching](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages-expiration.html).
- [CloudFront invalidation considerations](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html).
- [S3 replication within and across Regions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html).
- [AWS CLI get-bucket-replication](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-replication.html).
- [AWS CLI get-bucket-location](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-location.html).
- [S3 IAM integration and bucket ARN formats](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html).
- [S3 presigned uploads](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html).
- [S3 multipart upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html).
- [S3 event notification types and destinations](https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html).
- [Deleting versioned S3 objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectVersions.html).

## Issues Found
- The caching guidance used the ambiguous phrase "response policy," which could imply that a CloudFront response headers policy controls edge caching. Replaced it with origin response headers and the cache policy on the matching behavior, and clarified that a response headers policy affects viewer headers rather than CloudFront caching. AWS explicitly documents this distinction. No other technical corrections were necessary.

## Review Notes
- Both AWS CLI commands and their `--bucket` and `--output json` options are valid. The bucket names are explicit placeholders. The embedded Bash block passed a syntax check; the commands were not executed against an AWS account.
- `GetBucketLocation` remains supported for backward compatibility, but AWS recommends `HeadBucket` for region discovery. The post already acknowledges this and correctly maps `null` to `us-east-1` and `EU` to `eu-west-1`. Cross-account authorization limitations make the instruction to treat unknown locations as unresolved appropriate.
- Geographic restrictions govern viewer access. CloudFront uses globally deployed edge locations and regional edge caches; price classes can serve requests outside the selected class, and signed URLs provide access control rather than placement guarantees.
- A positive minimum TTL can override origin cache directives as described. Disabling caching does not bypass edge processing. Error caching has separate controls; for S3 origins, CloudFront enforces a one-second minimum even when Error Caching Minimum TTL is zero. The post appropriately calls for testing errors as well as successful responses.
- Cache expiration concerns freshness and revalidation, so it should not be treated as proof of physical erasure. The post correctly requires deletion evidence according to the deletion design rather than assuming a policy change removes existing copies.
- S3 supports same-region, cross-region, and cross-account replication, including multiple destinations and batch replication. General-purpose bucket ARNs do not encode a region. Live replication configuration alone cannot enumerate application-created copies.
- Presigned uploads are scoped by the signing principal's permissions and the specified target. Multipart parts can remain until completion or abort, and deleting an object in a versioned bucket can leave older versions. These behaviors support the proposed temporary-storage and deletion audits.
- Pipeline separation, least privilege, synthetic-object tracing, and review of external processors are architectural recommendations. No deployed pipeline or provider-specific residency commitment was supplied, so this review validates the guidance, not an actual deployment's residency compliance.
- All five AWS documentation links in the post resolve to the intended resources. No specific AWS CLI or service version is asserted in the post.
