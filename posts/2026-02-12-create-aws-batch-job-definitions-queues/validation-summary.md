# Validation Summary: How to Create AWS Batch Job Definitions and Queues

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- AWS Batch
- AWS CLI
- AWS Batch job definitions
- AWS Batch job queues
- AWS Batch retry strategies and timeouts
- AWS Batch job dependencies
- AWS Batch fair-share scheduling policies
- Amazon EFS volumes for AWS Batch jobs

## Sources Consulted
- AWS CLI Command Reference: `aws batch register-job-definition` - https://docs.aws.amazon.com/cli/latest/reference/batch/register-job-definition.html
- AWS CLI Command Reference: `aws batch submit-job` - https://docs.aws.amazon.com/cli/latest/reference/batch/submit-job.html
- AWS CLI Command Reference: `aws batch create-job-queue` - https://docs.aws.amazon.com/cli/latest/reference/batch/create-job-queue.html
- AWS CLI Command Reference: `aws batch create-scheduling-policy` - https://docs.aws.amazon.com/cli/latest/reference/batch/create-scheduling-policy.html
- AWS Batch User Guide: Create job definitions using EcsProperties - https://docs.aws.amazon.com/batch/latest/userguide/multi-container-jobs.html
- AWS Batch User Guide: Reference AWS Batch job scenarios using EcsProperties - https://docs.aws.amazon.com/batch/latest/userguide/multi-container-jobs-scenarios.html
- AWS Batch User Guide: Job dependencies - https://docs.aws.amazon.com/batch/latest/userguide/job_dependencies.html
- AWS Batch User Guide: Automated job retries - https://docs.aws.amazon.com/batch/latest/userguide/job_retries.html
- AWS Batch User Guide: Job timeouts - https://docs.aws.amazon.com/batch/latest/userguide/job_timeouts.html
- AWS Batch User Guide: Compute environments for AWS Batch - https://docs.aws.amazon.com/batch/latest/userguide/compute_environments.html
- AWS Batch API Reference: TaskContainerDependency - https://docs.aws.amazon.com/batch/latest/APIReference/API_TaskContainerDependency.html

## Issues Found
- The job definition examples used the deprecated `vcpus` and `memory` fields in `containerProperties`. Updated them to use `resourceRequirements` with `VCPU` and `MEMORY`, which is the current AWS Batch structure documented by AWS.
- The retry strategy had an `EXIT` rule for `onExitCode: "0"` and no catch-all exit rule. AWS Batch retries unmatched failures when `evaluateOnExit` is present, so this could retry failures outside the listed transient cases. Replaced it with a final `onReason: "*"` `EXIT` rule and updated the explanation.
- The exit code 137 explanation said the job might succeed on a different instance. Since the job memory limit remains fixed, that is not generally accurate. Reworded it as a container kill commonly related to memory pressure.
- The multi-container example used single-container `containerProperties` and did not define multiple containers. Replaced it with an `ecsProperties.taskProperties[].containers[]` example using a main container and sidecar, matching AWS Batch's documented multi-container structure.
- The job dependency examples used `type: "SEQUENTIAL"` with regular job IDs. AWS documents plain `jobId` dependencies for regular job chaining, while `SEQUENTIAL` is specifically useful for array-job sequencing. Removed the dependency type from the regular job examples.
- The compute environment order explanation described only a full first environment. Updated it to match AWS's documented behavior: Batch tries the next compute environment when the first is invalid or cannot provide a suitable compute resource.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI and AWS Batch documentation rather than local `aws --help` output.
