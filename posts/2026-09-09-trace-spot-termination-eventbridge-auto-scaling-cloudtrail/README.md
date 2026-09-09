# How to Trace a Spot Termination Across AWS Event and Activity Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EC2 Spot, EventBridge, CloudTrail, Troubleshooting

Description: Correlate Spot warnings, Auto Scaling activities, and CloudTrail records to distinguish EC2 reclamation from proactive replacement and other terminations.

A terminated Spot Instance is not necessarily an EC2 Spot reclamation. Auto Scaling might replace it after a rebalance recommendation, scale the group in, or remove it because a health check failed. An operator or deployment can also call a termination API.

Investigate the instance as a timeline across three sources: EventBridge for signals, Auto Scaling activity for the manager's decision, and CloudTrail for recorded API or service events. Match account, Region, instance ID, and time before drawing a conclusion.

## Preserve Identifiers and a Time Window

Start with the affected instance ID and its last known Auto Scaling group. Save the observed failure time in UTC and include several minutes before and after it. If the group has been deleted or the instance no longer appears in EC2, use existing inventory, logs, or resource tags captured earlier.

These examples use AWS CLI and `jq` with read access to the relevant account and Region:

```bash
export AWS_REGION=us-east-1
INSTANCE_ID=i-0123456789abcdef0
ASG_NAME=report-workers
START_TIME=2026-09-09T01:45:00Z
END_TIME=2026-09-09T02:15:00Z
```

Replace all sample values. A search in the wrong Region can return no evidence even when the event exists elsewhere. Preserve raw records alongside extracted fields so later questions do not depend on a lossy summary.

## Read the Captured EventBridge Signals

Look for `EC2 Instance Rebalance Recommendation` and `EC2 Spot Instance Interruption Warning` in your configured event target or archive. EventBridge does not provide a retrospective search of every service event merely because the default event bus existed. Retention needs to have been configured.

For future investigations, a rule can match these signals:

```json
{
  "source": ["aws.ec2"],
  "detail-type": [
    "EC2 Instance Rebalance Recommendation",
    "EC2 Spot Instance Interruption Warning"
  ]
}
```

Attach a durable target or archive with appropriate permissions and retention. Store the full event, including its ID, event time, account, Region, `detail-type`, and `detail.instance-id`.

A recommendation is risk evidence. An interruption warning is evidence of a planned interruption action. The warning's `detail.instance-action` distinguishes stop, terminate, and hibernate behavior. The `resources` ARN has a special format for Spot warnings, so join using the instance ID instead of assuming a standard EC2 ARN parser will always work. [Spot interruption event format](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html).

## Inspect Auto Scaling's Decision

Retrieve the group's activities and filter locally for the instance:

```bash
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name "$ASG_NAME" \
  --output json > scaling-activities.json

jq --arg id "$INSTANCE_ID" '
  .Activities[]
  | select(((.Description // "") + " " + (.Cause // "")) | contains($id))
  | {ActivityId, StartTime, EndTime, StatusCode, Description, Cause, StatusMessage}
' scaling-activities.json
```

This is a convenience filter, not a complete causal search. Also read surrounding activities: an initiating capacity change or a failed replacement launch might not mention the old instance ID. Preserve the full download and compare timestamps with your incident window.

Auto Scaling activity can distinguish rebalancing, health replacement, scale-in, and other management actions. Activities are available for a limited period, currently six weeks, so retain them externally when investigations require longer history. [DescribeScalingActivities API](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_DescribeScalingActivities.html).

If a recommendation is followed by a successful replacement and an Auto Scaling termination, the old instance may have been proactively retired before EC2 reclaimed it. Do not count that automatically as an EC2 interruption.

## Search CloudTrail for EC2 Reclamation

AWS documents `BidEvictedEvent` as evidence that EC2 terminated a Spot Instance. Query that event name over the incident window:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=BidEvictedEvent \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --output json > bid-evictions.json

jq --arg id "$INSTANCE_ID" '
  .Events[].CloudTrailEvent | fromjson
  | select((.serviceEventDetails.instanceIdSet // []) | index($id))
  | {eventTime, eventName, eventSource, awsRegion, userIdentity, serviceEventDetails}
' bid-evictions.json
```

The instance IDs are in `serviceEventDetails.instanceIdSet` for the documented record. Do not rely only on a `ResourceName` lookup to find them. The name `BidEvictedEvent` is historical; by itself it does not establish that a modern Spot interruption was caused by a price bid. [AWS termination identification guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/BidEvictedEvent.html).

## Check for a Termination API Call

If the reclamation record does not explain the incident, inspect `TerminateInstances`:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=TerminateInstances \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --output json > termination-calls.json

jq --arg id "$INSTANCE_ID" '
  .Events[].CloudTrailEvent | fromjson
  | select(any(.requestParameters.instancesSet.items[]?; .instanceId == $id))
  | {eventTime, eventName, userIdentity, userAgent, sourceIPAddress,
     requestParameters, errorCode, errorMessage}
' termination-calls.json
```

Read the caller identity and any errors. An attempted API call that failed does not prove termination occurred. A successful call may come from an automation role or an AWS service rather than a person. Correlate it with the Auto Scaling activity instead of classifying every API-driven termination as manual action.

`LookupEvents` searches the recent event history for one Region and supports one lookup attribute per request. Its history window is currently ninety days. Older incidents require previously configured trails or other retained CloudTrail data. [CloudTrail lookup reference](https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html).

## Write an Evidence-Based Timeline

Record the earliest recommendation, any interruption warning, replacement launch and readiness, termination record, and application recovery. Mark absent evidence explicitly: "No warning found in the configured log retention" is more precise than "No warning was sent."

If no records explain the termination, verify retention, delivery failures, account, Region, and time range. Notification and log delivery can lag the instance event, so allow ingestion time before closing the investigation. Also check for fault-injection experiments and deployment activity during the same window.

## Conclusion

Use signals to understand what EC2 reported, activities to understand what Auto Scaling decided, and CloudTrail to identify the recorded action. Correlation prevents proactive replacement and scale-in from being mislabeled as Spot reclamation and makes the resulting interruption metrics more useful.

## Official Documentation

- [Spot interruption notice fields](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [Identify EC2 Spot terminations with CloudTrail](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/BidEvictedEvent.html)
- [DescribeScalingActivities API](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_DescribeScalingActivities.html)
- [CloudTrail LookupEvents CLI](https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html)
- [Auto Scaling CloudTrail logging](https://docs.aws.amazon.com/autoscaling/ec2/userguide/logging-using-cloudtrail.html)
