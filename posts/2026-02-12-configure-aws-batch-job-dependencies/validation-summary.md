# Validation Summary: How to Configure AWS Batch Job Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Batch
- AWS Batch job dependencies
- AWS Batch array jobs
- AWS CLI
- Boto3 for Python
- AWS Batch retry strategies
- AWS Step Functions

## Sources Consulted
- AWS Batch User Guide: Job dependencies - https://docs.aws.amazon.com/batch/latest/userguide/job_dependencies.html
- AWS Batch User Guide: Array jobs - https://docs.aws.amazon.com/batch/latest/userguide/array_jobs.html
- AWS CLI Command Reference: aws batch submit-job - https://docs.aws.amazon.com/cli/latest/reference/batch/submit-job.html
- Boto3 Documentation: Batch.Client.submit_job - https://docs.aws.amazon.com/boto3/latest/reference/services/batch/client/submit_job.html
- AWS Batch User Guide: Automated job retries - https://docs.aws.amazon.com/batch/latest/userguide/job_retries.html
- AWS HPC Blog: Encoding workflow dependencies in AWS Batch - https://aws.amazon.com/blogs/hpc/encoding-workflow-dependencies-in-aws-batch/

## Issues Found
- The dependency type descriptions were inaccurate. `SEQUENTIAL` and `N_TO_N` are array-job dependency types: `SEQUENTIAL` orders children within one array job without a job ID, while `N_TO_N` makes each child in one array job wait for the matching child index in another array job. Updated the descriptions to match AWS documentation.
- The fan-in example incorrectly used `type=N_TO_N` for a basic aggregation job depending on an array job. A basic job should depend on the parent array job ID without `N_TO_N`; AWS states that a basic job depending on an array job parent starts only after all array child jobs complete successfully. Updated the command and explanation.
- The dependency limits section included unsupported and contradictory queue/circular-dependency wording. Replaced it with accurate guidance that dependencies reference submitted AWS Batch job IDs and should be submitted in dependency order.
- The retry note implied that retrying exit code 137 could move the job to a larger instance. AWS Batch retries the job attempt, but persistent memory pressure should be fixed by increasing the job's memory requirement. Updated the wording.

## Review Notes
The AWS CLI examples use valid current `submit-job` flags and shorthand syntax. The Boto3 example uses the current `submit_job` parameter names for `dependsOn`, `containerOverrides`, and `arrayProperties`. The retry strategy syntax is valid; note that AWS retries unmatched `evaluateOnExit` failures by default unless a catch-all `EXIT` rule is added.
