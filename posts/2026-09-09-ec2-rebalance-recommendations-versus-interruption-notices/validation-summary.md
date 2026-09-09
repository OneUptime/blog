# Validation Summary: How to Interpret EC2 Rebalance and Spot Interruption Notices

## Status
validated

## Post Type
Technical guide with EventBridge configuration, AWS CLI commands, and a Bash IMDSv2 diagnostic.

## Technologies Covered
- Amazon EC2 Spot Instances and interruption signals
- Amazon EventBridge rules, targets, retries, and dead-letter queues
- EC2 Instance Metadata Service Version 2 (IMDSv2)
- Amazon EC2 Auto Scaling Capacity Rebalancing and lifecycle hooks
- AWS CLI, JSON, Bash, and curl
- Fault tolerance, idempotent processing, checkpointing, and traffic draining

## Sources Consulted
- [EC2 rebalance recommendations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/rebalance-recommendations.html)
- [Spot interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [Auto Scaling lifecycle hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)
- [Auto Scaling Capacity Rebalancing](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html)
- [AWS CLI events put-rule](https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html)
- [Loading AWS CLI parameters from files](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-file.html)
- [EventBridge array matching](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns-arrays.html)
- [EventBridge delivery retries](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html)
- [EventBridge dead-letter queues](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html)
- [EventBridge resource-based permissions](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html)
- [Using IMDSv2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [curl command reference](https://curl.se/docs/manpage.html)
- [SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Application Load Balancer target group attributes and deregistration delay](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html)

## Issues Found
- The lifecycle-hook sentence said a hook cannot postpone Spot reclamation “indefinitely,” which could imply that it can temporarily extend the EC2 interruption deadline. Changed it to “cannot delay EC2 reclaiming Spot capacity.” AWS documents that lifecycle hooks do not prevent termination when Spot capacity is reclaimed; they coordinate the Auto Scaling lifecycle only.

## Review Notes
- Confirmed the distinction between elevated interruption risk and pending interruption, best-effort notification delivery, simultaneous signals, the stop/terminate warning interval, and immediate hibernation. The metadata recommendation timestamp describes signal emission, not a shutdown deadline.
- Confirmed both EventBridge detail-type values, the aws.ec2 source, instance identification fields, the interruption event's unusual Availability Zone ARN format, and use of the default event bus. The array matches either event type. The CLI flags, ENABLED state, and file:// parameter syntax are current.
- Confirmed that targets and delivery permissions must be configured separately and that retries or queue buffering do not extend the interruption window.
- Confirmed the token endpoint, PUT method, token headers, valid 60-second TTL, both metadata paths, absent-item 404 behavior, and five-second polling guidance. The curl options provide bounded requests and separate HTTP status output. HTTP errors on metadata GETs remain visible because those requests intentionally omit --fail.
- The one-shot diagnostic exits on token acquisition or transport failure under set -e. It is not a resilient production polling loop; the surrounding text appropriately requires renewal, JSON parsing, and failure monitoring for production.
- The state machine is conceptual application design. Idempotent transitions, durable checkpoints, a single replacement owner, and recovery from abrupt loss are consistent with the documented delivery and capacity constraints. Capacity Rebalancing attempts replacement but cannot guarantee replacement readiness before reclamation.
- All four documentation links and the author profile link resolve to the expected resources. No deprecated API or option was identified. The EC2 rebalance documentation limits support to Spot Instances launched after November 5, 2020; this is a historical caveat for unusually old instances.
- Local verification: parsed the JSON example and checked both Bash examples with bash -n. No AWS resources were created, no live IMDS requests were issued, and interruption/draining behavior was not integration-tested. Runtime execution requires a configured AWS CLI with suitable permissions and an EC2 instance with reachable IMDS.
