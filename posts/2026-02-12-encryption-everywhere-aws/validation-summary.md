# Validation Summary: How to Implement Encryption Everywhere on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS KMS
- Amazon S3 server-side encryption and bucket policies
- Amazon EBS encryption by default
- Amazon RDS encryption
- AWS Certificate Manager
- Application Load Balancer TLS listeners
- AWS Organizations Service Control Policies
- AWS Config
- Terraform
- AWS CloudFormation
- Python boto3

## Sources Consulted
- AWS KMS condition keys: https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html
- Amazon S3 default encryption FAQ: https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html
- AWS CloudFormation AWS::S3::Bucket ServerSideEncryptionByDefault: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-serversideencryptionbydefault.html
- Amazon S3 bucket policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- Amazon EBS encryption by default: https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html
- Amazon RDS encryption: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Elastic Load Balancing ALB security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- Amazon RDS IAM condition keys: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrds.html
- boto3 EC2 describe_volumes: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_volumes.html
- boto3 S3 get_bucket_encryption: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/get_bucket_encryption.html
- GDPR Article 32, EUR-Lex: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679
- HHS HIPAA Security Rule addressable implementation specifications: https://www.hhs.gov/hipaa/for-professionals/faq/2020/what-is-the-difference-between-addressable-and-required-implementation-specifications/index.html

## Issues Found
- The post implied encryption is optional in most cases, but Amazon S3 has automatically applied SSE-S3 to new object uploads since January 5, 2023. Updated the language to distinguish baseline S3 encryption from stronger, configurable settings such as SSE-KMS.
- The architecture diagram showed AWS KMS as the foundation for encryption in transit. KMS is central to many encryption-at-rest patterns, while TLS in transit is handled through services such as ACM and load balancer listeners. Updated the diagram relationship.
- The KMS key policy used `ebs.${var.region}.amazonaws.com` for `kms:ViaService`. AWS documents EBS access through the EC2 service name, so this was corrected to `ec2.${var.region}.amazonaws.com`; `kms:DescribeKey` was also added to the service-use action list.
- The S3 CloudFormation example referenced `DataKey` without defining it. Added a `DataKey` parameter and clarified that the bucket policy denies the wrong explicit encryption mode, while HTTPS enforcement now uses the documented Bool condition value.
- The ACM/ALB Terraform example requested a DNS-validated certificate but did not create validation records or wait for certificate validation before attaching it to the listener. Added Route 53 validation records and `aws_acm_certificate_validation`.
- The ALB TLS policy was not the latest AWS-recommended policy as of this review. Updated it to `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`, which AWS recommends for backward-compatible post-quantum TLS migration.
- The boto3 audit script did not paginate EC2 or RDS responses and caught all S3 `ClientError` exceptions as unencrypted buckets. Updated it to use paginators and only classify the specific S3 missing-encryption-configuration error as unencrypted.
- The compliance sentence stated that GDPR, HIPAA, SOC 2, and PCI-DSS all require encryption. That was too absolute because these frameworks treat encryption differently, such as GDPR's risk-based language and HIPAA's addressable implementation specifications. Updated the sentence to describe encryption as an important regulatory control and expectation.
- The bottom-line guidance referred to S3 bucket encryption as an account-wide setting. Updated it to recommend configuring SSE-KMS bucket defaults where customer-managed keys are required.

## Review Notes
The remaining snippets are illustrative and still assume surrounding resources exist, such as IAM roles, ALB resources, target groups, Route 53 zone data, VPC networking, and Terraform provider configuration. The RDS PostgreSQL engine version shown is valid as an example, but teams should choose a currently supported minor version for production.
