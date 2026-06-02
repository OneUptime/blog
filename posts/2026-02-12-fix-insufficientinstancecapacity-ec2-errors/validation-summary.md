# Validation Summary: How to Fix 'InsufficientInstanceCapacity' EC2 Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon EC2
- AWS CLI
- Boto3 for Python
- EC2 Fleet
- EC2 Auto Scaling
- EC2 On-Demand Capacity Reservations
- EC2 Spot Instances and Spot placement score

## Sources Consulted
- AWS EC2 User Guide: Troubleshoot Amazon EC2 instance launch issues - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshooting-launch.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: create-fleet - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-fleet.html
- AWS EC2 User Guide: Example CLI configurations for EC2 Fleet - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-examples.html
- AWS CLI Command Reference: create-capacity-reservation - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-capacity-reservation.html
- AWS EC2 User Guide: Reserve compute capacity with EC2 On-Demand Capacity Reservations - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html
- AWS CLI Command Reference: describe-scaling-activities - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-scaling-activities.html
- AWS CLI Command Reference: get-spot-placement-scores - https://docs.aws.amazon.com/cli/latest/reference/ec2/get-spot-placement-scores.html
- AWS EC2 User Guide: Spot placement score - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-placement-score.html
- AWS EC2 User Guide: Best practices for Amazon EC2 Spot - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- Boto3 documentation: Error handling - https://docs.aws.amazon.com/boto3/latest/guide/error-handling.html

## Issues Found
- The Boto3 example used `ec2.exceptions.ClientError`, but Boto3 documents AWS service errors as `botocore.exceptions.ClientError`. Updated the example to import and catch `ClientError` from `botocore.exceptions`.
- The same Boto3 example printed "retrying" after an `InsufficientInstanceCapacity` error but then advanced to the next batch instead of retrying the failed batch. Wrapped each batch launch in a retry loop so the behavior matches the text.
- The Spot Instances section described Spot usage as "bidding on unused capacity across the entire pool." AWS's current documentation describes Spot as spare EC2 capacity, with capacity pools scoped by instance type and Availability Zone. Updated the wording to avoid outdated bidding terminology and to clarify that Spot capacity still fluctuates.

## Review Notes
The AWS CLI examples use current command names and options. The EC2 Fleet JSON shape, Capacity Reservation command, Auto Scaling activity query, and Spot placement score command are consistent with current AWS documentation. The Spot placement score command already specifies three instance types, matching AWS guidance that one or two instance types produce a low score.
