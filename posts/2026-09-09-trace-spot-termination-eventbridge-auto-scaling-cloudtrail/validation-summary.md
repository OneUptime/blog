# Validation Summary: How to Trace a Spot Termination Across AWS Event and Activity Logs

## Status

validated

## Post Type

Technical troubleshooting guide with AWS CLI commands, an EventBridge event pattern, and jq filters.

## Technologies Covered

- Amazon EC2 Spot Instances and interruption signals
- Amazon EventBridge rules, targets, archives, and replay
- Amazon EC2 Auto Scaling activities and Capacity Rebalancing
- AWS CloudTrail event history and termination records
- AWS CLI, Bash, JSON, and jq
- AWS Fault Injection Service (FIS)

## Sources Consulted

- [EC2 Spot interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html): event fields, action values, special ARN format, and best-effort delivery.
- [Identify EC2 Spot terminations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/BidEvictedEvent.html): BidEvictedEvent and serviceEventDetails.instanceIdSet.
- [EC2 instance rebalance recommendations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/rebalance-recommendations.html): event name, source, instance identifier, and risk interpretation.
- [DescribeScalingActivities API](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_DescribeScalingActivities.html): response fields and six-week history limit.
- [DescribeScalingActivities CLI](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-scaling-activities.html): command options, automatic pagination, and retrieval for deleted groups.
- [Auto Scaling Capacity Rebalancing](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html): proactive replacement and replacement health checks before termination.
- [CloudTrail LookupEvents CLI](https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html): event-name lookup, time bounds, one lookup attribute, pagination, and regional 90-day history.
- [EC2 CloudTrail logging and event examples](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitor-with-cloudtrail.html): TerminateInstances requestParameters.instancesSet.items and caller attribution.
- [Auto Scaling CloudTrail logging](https://docs.aws.amazon.com/autoscaling/ec2/userguide/logging-using-cloudtrail.html): user, role, and AWS service callers and management-event retention.
- [EventBridge archives and replay](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-archive.html): archive event patterns, retention, source-bus replay, rule selection, and ingestion delay.
- [AWS CLI environment variables](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html): AWS_REGION configuration.
- [TerminateInstances API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_TerminateInstances.html): termination semantics and idempotency.
- [FIS Spot interruption tutorial](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html): experiments can produce rebalance recommendations, interruption notices, and instance termination.
- [jq manual](https://jqlang.org/manual/): fromjson, select, contains, index, any, optional iteration, and alternative values.

## Issues Found

1. **Deleted Auto Scaling groups were not included in the activity command.** The guide explicitly covers investigations after group deletion, but the original command omitted the option required for that case. Added `--include-deleted-groups` and a short explanation, matching the official CLI example.
2. **EventBridge archive access and configuration were ambiguous.** The text treated an archive as a directly inspectable alternative to a target and suggested attaching either to a rule. Clarified that an archive is created on the event bus with an event pattern, and that archived events are inspected by replaying the incident window to the source bus with a selected logging rule.

## Review Notes

- Confirmed the two event names, JSON pattern, interruption action values, special Spot-warning ARN format, and instance-ID correlation fields.
- Confirmed the documented CloudTrail record shapes used by both filters. An index of zero is truthy in jq, so a matching first instance ID is correctly retained.
- Confirmed that both AWS CLI operations paginate automatically; the examples do not disable pagination or truncate results with a maximum-item limit.
- Confirmed the six-week Auto Scaling activity limit and regional 90-day CloudTrail event-history window. Longer investigations depend on previously retained data.
- The distinction between proactive replacement and EC2 interruption is sound. A recommendation alone does not prove reclamation, and caller identity and API errors must be considered before attribution.
- Locally checked all four Bash blocks with `bash -n` and parsed the JSON event pattern. Executed all three extracted jq filters against synthetic records covering matches, nonmatches, missing fields, multiple instance IDs, and a failed termination call. All checks passed.
- No live AWS queries, archive replay, or fault-injection experiments were performed. Service behavior and CLI options were checked against official documentation; filter execution used local fixtures.
- All five official documentation URLs already listed in the post resolved to the intended resources. No deprecated command or API usage was found. Examples were reviewed against AWS CLI v2 documentation.
