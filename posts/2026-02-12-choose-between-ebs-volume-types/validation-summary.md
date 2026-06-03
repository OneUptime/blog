# Validation Summary: How to Choose Between EBS Volume Types (gp3, io2, st1, sc1)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EBS
- Amazon EC2
- AWS CLI
- Amazon CloudWatch
- EBS General Purpose SSD volumes: gp3 and gp2
- EBS Provisioned IOPS SSD volumes: io2 and io1
- EBS HDD volumes: st1 and sc1

## Sources Consulted
- Amazon EBS volume types: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- Amazon EBS General Purpose SSD volumes: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- Amazon EBS Provisioned IOPS SSD volumes: https://docs.aws.amazon.com/ebs/latest/userguide/provisioned-iops.html
- Amazon EBS Throughput Optimized HDD and Cold HDD volumes: https://docs.aws.amazon.com/ebs/latest/userguide/hdd-vols.html
- Amazon EBS Multi-Attach: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html
- Amazon EBS pricing: https://aws.amazon.com/ebs/pricing/
- Amazon EBS volume types product page: https://aws.amazon.com/ebs/volume-types/
- AWS CLI create-volume reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-volume.html
- AWS CLI modify-volume reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-volume.html
- AWS CLI get-metric-statistics reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html

## Issues Found
- The introduction said AWS offers six EBS volume types, but AWS also documents Magnetic (`standard`) as a previous-generation EBS volume type. Changed the wording to "several EBS volume types" to avoid an inaccurate count.
- The post used older gp3 maximums of 16,000 IOPS and 1,000 MB/s. Current AWS documentation lists gp3 at up to 80,000 IOPS and 2,000 MB/s. Updated the comparison table, io2 guidance, and decision flowchart.
- The post treated io2 and io2 Block Express as separate current choices and listed io2 at 64,000 IOPS. AWS documentation says all new and previously created io2 volumes are io2 Block Express as of April 30, 2025, with up to 256,000 IOPS and 4,000 MB/s on Nitro-based instances. Consolidated the table row and updated the io2 section.
- The io2 premium list said io2 provides up to 64,000 IOPS per volume. Updated it to 256,000 IOPS per volume on Nitro-based instances.

## Review Notes
The AWS CLI examples use valid commands and options according to the AWS CLI reference. The local environment did not have the `aws` CLI installed, so command syntax was verified against official AWS CLI documentation rather than local `--help` output. Pricing examples use common US East style rates; AWS pricing varies by Region and should be rechecked before publication if the post needs region-specific guarantees.
