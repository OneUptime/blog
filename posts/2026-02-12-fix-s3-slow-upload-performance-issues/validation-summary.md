# Validation Summary: How to Fix S3 'Slow Upload' Performance Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- AWS CLI
- boto3 / botocore
- S3 multipart uploads
- S3 Transfer Acceleration
- S3 storage classes
- Amazon EC2 instance type metadata
- VPC Gateway Endpoints for S3
- S3 request metrics

## Sources Consulted
- AWS CLI S3 configuration reference: https://docs.aws.amazon.com/cli/latest/topic/s3-config.html
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Amazon S3 multipart upload overview: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html
- Amazon S3 multipart upload limits: https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
- Amazon S3 Transfer Acceleration examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration-examples.html
- Amazon S3 Transfer Acceleration speed comparison tool: https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration-speed-comparison.html
- boto3 S3 transfer configuration guide: https://docs.aws.amazon.com/boto3/latest/guide/s3.html
- boto3 configuration guide: https://docs.aws.amazon.com/boto3/latest/guide/configuration.html
- botocore Config reference: https://docs.aws.amazon.com/botocore/latest/reference/config.html
- AWS CLI `ec2 describe-instance-types` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-types.html
- Amazon S3 storage classes overview: https://aws.amazon.com/s3/storage-classes/
- Gateway endpoints for Amazon S3: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- AWS CLI `s3api put-bucket-metrics-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-metrics-configuration.html

## Issues Found
- The post said multipart upload is "essential" for files over 100 MB. AWS says multipart upload should be considered at 100 MB, while it is required only for objects larger than the single PUT limit. Changed the wording to "strongly recommended."
- The large-file AWS CLI example used `--expected-size` on a regular file upload and did not actually change the multipart chunk size. `--expected-size` is documented for large streamed uploads from stdin. Added the `multipart_chunksize` setting for regular files and limited `--expected-size` to the stdin streaming case.
- The boto3 Transfer Acceleration example used `boto3.session.Config`. Updated it to import and use `Config` from `botocore.config`, which is the documented configuration object.
- The Transfer Acceleration speed test example used `curl`, which only downloads the HTML page and does not perform the browser-based speed comparison. Replaced it with a browser URL including the documented `region` and `origBucketName` query parameters.
- The storage class section claimed that choosing a storage class can improve upload throughput by reducing S3 backend processing. AWS documentation frames storage classes around access pattern, cost, latency, and retrieval behavior, not as a general upload-throughput fix. Reworded the claim to focus on storage cost and avoiding later transitions.
- The EC2 instance type query referenced `NetworkInfo.MaximumNetworkBandwidth`, which is not a documented field in the `describe-instance-types` response. Changed the query to return `NetworkInfo.NetworkPerformance`.
- The VPC Gateway Endpoint section claimed traffic avoids the public internet and is usually faster. AWS documents that gateway endpoints allow S3 access from a VPC without an internet gateway or NAT device and have no additional charge, but does not guarantee faster transfers. Reworded the section to match the documented routing and cost behavior.

## Review Notes
The remaining examples are technically valid but environment-dependent: AWS CLI commands require configured credentials, permissions, region selection, and existing buckets/VPC resources. Transfer Acceleration can improve long-distance transfers, but AWS recommends testing because benefits vary by client location and bucket Region.
