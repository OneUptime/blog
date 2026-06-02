# Validation Summary: How to Troubleshoot ECS Out-of-Memory Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Docker container memory limits
- AWS CLI
- Amazon CloudWatch and Container Insights
- CloudWatch Logs Insights
- Application Auto Scaling
- Node.js
- Java and JVM memory tuning

## Sources Consulted
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Troubleshooting Amazon ECS OutOfMemoryError errors: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/out-of-memory.html
- Amazon ECS CloudWatch metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Amazon ECS Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- Container Insights performance log events for Amazon ECS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-reference-performance-logs-ECS.html
- Amazon ECS target tracking scaling policy documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/target-tracking-create-policy.html
- AWS CLI describe-tasks command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-tasks.html
- AWS CLI get-metric-statistics command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI start-query command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/start-query.html
- AWS CLI get-query-results command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/get-query-results.html
- AWS CLI put-scaling-policy command reference: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scaling-policy.html
- AWS CLI put-metric-alarm command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Node.js process.memoryUsage and v8.getHeapStatistics documentation: https://nodejs.org/api/process.html and https://nodejs.org/api/v8.html
- Oracle Java Runtime API and Java command documentation: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Runtime.html and https://docs.oracle.com/en/java/javase/15/docs/specs/man/java.html

## Issues Found
- The Fargate CPU/memory table omitted current 8 vCPU and 16 vCPU task sizes. Added those rows using the current AWS-supported memory ranges.
- The table labeled ECS task memory values as MB. Changed the table heading to MiB, which matches ECS task-definition units.
- The container-level memory explanation said the sum of container hard limits cannot exceed task memory on Fargate. Updated it to match AWS documentation: the total memory reserved for containers must be lower than task memory, using `memoryReservation` when present and `memory` otherwise.
- The exit-code section treated 137 as a guaranteed OOM signal. Clarified that 137 means SIGKILL and should be confirmed with ECS stop details.
- The stopped-reason section implied "Essential container in task exited" plus exit code 137 always confirms OOM. Updated it to require an OutOfMemoryError or memory-usage reason.
- The AWS CLI examples used BSD/macOS `date -v` syntax, which does not work in typical Linux AWS CLI environments. Replaced it with GNU `date -d` syntax.
- The CloudWatch Logs Insights examples used `aws logs start-query` but did not retrieve query results. Added `aws logs get-query-results` using the returned query ID and a wait loop for the asynchronous query to complete.
- The Logs Insights aliases used `*_mb` for Container Insights memory values. Changed them to `*_mib` to reflect AWS's documented units.
- The Java section said the JVM always sizes heap from host memory rather than container memory. Updated it to reflect modern HotSpot container awareness while preserving the recommendation to set explicit heap sizing flags.

## Review Notes
The autoscaling example assumes the ECS service has already been registered as an Application Auto Scaling scalable target. That is technically consistent with AWS CLI behavior, but future edits could mention `register-scalable-target` if the article expands setup steps.
