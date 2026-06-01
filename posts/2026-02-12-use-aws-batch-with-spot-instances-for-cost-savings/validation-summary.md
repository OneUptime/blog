# Validation Summary: How to Use AWS Batch with Spot Instances for Cost Savings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Batch
- Amazon EC2 Spot Instances
- AWS CLI
- Amazon ECS container behavior
- AWS IAM roles for Spot Fleet
- Python signal handling
- Amazon S3 checkpointing

## Sources Consulted
- AWS Batch API Reference: ComputeResource - https://docs.aws.amazon.com/batch/latest/APIReference/API_ComputeResource.html
- AWS Batch User Guide: Use Amazon EC2 Spot best practices for AWS Batch - https://docs.aws.amazon.com/batch/latest/userguide/bestpractice6.html
- AWS Batch CLI Reference: create-compute-environment - https://docs.aws.amazon.com/cli/latest/reference/batch/create-compute-environment.html
- AWS Batch API Reference: EvaluateOnExit - https://docs.aws.amazon.com/batch/latest/APIReference/API_EvaluateOnExit.html
- AWS Batch User Guide: Automated job retries - https://docs.aws.amazon.com/batch/latest/userguide/job_retries.html
- AWS Batch API Reference: ComputeEnvironmentOrder - https://docs.aws.amazon.com/batch/latest/APIReference/API_ComputeEnvironmentOrder.html
- AWS Batch User Guide: Amazon EC2 spot fleet role - https://docs.aws.amazon.com/batch/latest/userguide/spot_fleet_IAM_role.html
- Amazon ECS Developer Guide: Configuring Amazon ECS Linux container instances to receive Spot Instance notices - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/spot-instance-draining-linux-container.html
- Amazon ECS Developer Guide: CannotPullContainer task errors - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_cannot_pull_image.html
- Amazon EC2 User Guide: Spot Instance interruptions - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-interruptions.html
- Amazon EC2 User Guide: Get the status of a Spot Instance request - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-request-status.html

## Issues Found
- Updated the Spot allocation strategy from `SPOT_CAPACITY_OPTIMIZED` as an unconditional recommendation to `SPOT_PRICE_CAPACITY_OPTIMIZED` as the recommended default for most workloads, while retaining `SPOT_CAPACITY_OPTIMIZED` as a valid option when interruption avoidance is the priority.
- Removed the explicit `bidPercentage: 100` setting from the compute environment example and changed the guidance to leave it empty for most workloads, matching AWS CLI guidance that the default is 100% of On-Demand.
- Changed the example Spot Fleet role from `AmazonEC2SpotFleetRole` to `AmazonEC2SpotFleetTaggingRole`, matching current AWS Batch guidance for Spot Fleet permissions.
- Corrected the retry strategy pattern for image pull failures from `Cannot pull container*` to `CannotPullContainerError*`, matching Amazon ECS stopped task error naming.
- Removed the invalid `onReason: "*spot*"` retry condition and replaced it with a valid `onExitCode: "143"` retry condition for SIGTERM-triggered exits.
- Changed the SIGTERM handler from `sys.exit(0)` to `sys.exit(143)` so a partially completed interrupted job is retried instead of being reported as successful.
- Initialized `current_state` before registering the signal handler so the handler has a valid checkpoint state even if SIGTERM arrives early.
- Replaced the hard-coded monitoring query date with a dynamic UTC timestamp for the previous 24 hours.

## Review Notes
The AWS CLI is not installed in this workspace, so CLI shape validation was performed against the official AWS CLI command reference instead of local `aws --help` output. The Python snippet remains illustrative because `load_work_items()` and `process_item()` are application-specific placeholders.
