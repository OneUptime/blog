# Validation Summary: How to Choose the Right Lambda Memory Size for Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch Logs
- AWS CLI
- Amazon SQS
- Python concurrent.futures
- Node.js promises and worker threads
- AWS Lambda Power Tuning

## Sources Consulted
- AWS Lambda: Configure Lambda function memory - https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html
- AWS Lambda: Viewing CloudWatch logs for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-view.html
- AWS Lambda quotas - https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS CLI: lambda invoke command reference - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/lambda/invoke.html
- AWS CLI: logs filter-log-events command reference - https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html
- AWS CLI: lambda wait command reference - https://docs.aws.amazon.com/cli/latest/reference/lambda/wait/index.html
- AWS Lambda: Creating and configuring an Amazon SQS event source mapping - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda pricing - https://aws.amazon.com/lambda/pricing/
- AWS Lambda Power Tuning repository - https://github.com/alexcasalboni/aws-lambda-power-tuning
- Python concurrent.futures documentation - https://docs.python.org/3/library/concurrent.futures.html
- Node.js worker_threads documentation - https://nodejs.org/api/worker_threads.html

## Issues Found
- The CPU allocation formula was presented as exact for all memory sizes. Changed it to "Approximate" and added the documented 10,240 MB / 6 vCPU upper bound.
- The post said 1,769 MB gives "exactly one full vCPU" and described lower/higher settings as shared or dedicated CPU cores. Updated this to AWS's documented "equivalent of one vCPU" and "access to more than one vCPU" wording.
- The REPORT-line parser used `grep -oP 'Duration: ...'`, which can also match `Billed Duration` or `Init Duration`. Replaced it with `awk` parsing that extracts the first `Duration:` field and the `Max Memory Used` field explicitly.
- The sample cost-per-invocation values were about 10x too high for the stated pricing formula and AWS Lambda x86 GB-second price. Recalculated the table values.
- The CPU-bound analysis said duration decreases linearly as memory increases. Changed this to "roughly inversely" to match the stated memory/CPU relationship.
- The SQS queue processor timeout recommendation said to match the SQS visibility timeout. Updated it to say the Lambda timeout must be at or below the queue visibility timeout and that AWS recommends a queue visibility timeout at least six times the function timeout.
- The cold-start diagnostic compared init duration with "total duration", but AWS documents `Duration` as handler duration excluding init. Updated the wording to compare init duration relative to handler duration.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference instead of local `--help` output. The benchmark script still assumes a Unix-like shell with `base64`, `awk`, and `bc` available.
