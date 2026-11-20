# Validation summary

Reviewed official EC2 eventual-consistency guidance, InstanceRunning waiter, DescribeInstances, and client-token idempotency documentation. The installed Boto3 1.40.76 waiter model was inspected.

Python3.11.13 tests exercised the actual SDK waiter with stubbed responses in nine scenarios: pending and temporary-not-found success, terminated failure, authorization failure, exhausted attempts, and four mismatched postconditions. Tests used zero polling delay; article defaults retain bounded polling. Published code exactly matches the tested file and parses. Mermaid structure has seven nodes/eight edges. Image visually reviewed without clipping.

No live AWS request, resource mutation, true propagation timing, real SDK network retry, durable checkpoint, lost creation response, or application readiness check was tested. Waiter attempt count is explicitly not a wall-clock deadline. Mermaid was not rendered.

## Sources

- https://docs.aws.amazon.com/ec2/latest/devguide/eventual-consistency.html
- https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/waiter/InstanceRunning.html
- https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeInstances.html
- https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
