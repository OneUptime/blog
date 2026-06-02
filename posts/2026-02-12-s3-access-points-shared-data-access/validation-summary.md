# Validation Summary: How to Use S3 Access Points for Shared Data Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3
- S3 Access Points
- AWS IAM policies
- AWS CLI
- Amazon VPC endpoints
- Boto3 for Python

## Sources Consulted
- AWS S3 User Guide: Managing access to shared datasets with access points: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points.html
- AWS S3 User Guide: Configuring IAM policies for using access points: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-policies.html
- AWS S3 User Guide: Referencing access points with ARNs, access point aliases, or virtual-hosted-style URIs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-naming.html
- AWS S3 User Guide: Creating access points restricted to a virtual private cloud: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-vpc.html
- AWS S3 User Guide: Access points naming rules, restrictions, and limitations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-restrictions-limitations-naming-rules.html
- AWS CLI Command Reference: s3control create-access-point: https://docs.aws.amazon.com/cli/latest/reference/s3control/create-access-point.html
- AWS CLI Command Reference: s3control list-access-points: https://docs.aws.amazon.com/cli/latest/reference/s3control/list-access-points.html
- AWS CLI Command Reference: s3control put-access-point-policy: https://docs.aws.amazon.com/cli/latest/reference/s3control/put-access-point-policy.html
- AWS CLI Command Reference: ec2 create-vpc-endpoint: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS VPC User Guide: Gateway endpoints for Amazon S3: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- Boto3 documentation: S3 list_objects_v2: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_objects_v2.html

## Issues Found
- The data team read-write access point policy claimed to limit access to the `data-team/` prefix, but `s3:ListBucket` was combined with object permissions and did not include an `s3:prefix` condition. I split the object actions and list action into separate statements and added an `s3:prefix` condition for `data-team/*`.
- The partner access point policy allowed `s3:ListBucket` without a prefix condition while the example described access to `shared-data/`. I split object read and list permissions and added an `s3:prefix` condition for `shared-data/*`.
- The delegation section said the bucket policy must delegate access control for access points to work. AWS documentation says access point permissions are effective only if the underlying bucket also permits the access, and bucket delegation is the recommended approach. I updated the wording to match that behavior.
- The VPC-restricted access point section did not mention that restrictive VPC endpoint policies must allow both the access point and the underlying bucket. I added that caveat.

## Review Notes
The local AWS CLI was not installed in the review environment, so command validation was performed against the official AWS CLI documentation instead of local `--help` output.
