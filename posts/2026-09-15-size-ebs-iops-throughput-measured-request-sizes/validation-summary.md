# Validation Summary: How to Size EBS IOPS and Throughput from Measured I/O Request Sizes

## Status
validated

## Post Type
Technical capacity-planning guide

## Technologies Covered

- Amazon Elastic Block Store (EBS), including SSD-backed volumes and `gp3`
- Amazon CloudWatch EBS volume metrics
- Amazon EC2 EBS-optimized instance performance
- Python arithmetic example

## Sources Consulted

- [Amazon EBS I/O characteristics and monitoring](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-io-characteristics.html)
- [Amazon CloudWatch metrics for Amazon EBS](https://docs.aws.amazon.com/ebs/latest/userguide/using_cloudwatch_ebs.html)
- [Amazon EBS General Purpose SSD volumes](https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html)
- [Amazon EBS-optimized instance types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-optimized.html)

## Issues Found
No technical issues found.

## Review Notes
The Python example is syntactically valid and its calculated outputs are correct. The `gp3` limits described in the post reflect the AWS documentation available on the validation date; platform-specific limits, including the lower limits on Outposts, are appropriately covered by the post's caveat about platform differences.
