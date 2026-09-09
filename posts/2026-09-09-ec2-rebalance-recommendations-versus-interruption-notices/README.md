# How to Interpret EC2 Rebalance and Spot Interruption Notices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EC2 Spot, EventBridge, Fault Tolerance, Auto Scaling

Description: Handle EC2 rebalance recommendations and interruption warnings with distinct actions, bounded metadata polling, and idempotent application recovery.

An EC2 rebalance recommendation says a Spot Instance has an elevated risk of interruption. A Spot interruption notice says EC2 is preparing to interrupt it. Those signals require related but different responses.

Use the recommendation to prepare replacement capacity and reduce exposure. Use the interruption notice to execute a bounded shutdown path. Design the application to recover when either signal arrives late or is absent, because these notifications are delivered on a best-effort basis.

## Distinguish Risk from an Interruption Deadline

| Signal | Meaning | Useful response |
| --- | --- | --- |
| Rebalance recommendation | Elevated interruption risk | Start replacement, checkpoint, and reduce new assignments |
| Interruption warning | An interruption action is pending | Stop accepting work and finish or checkpoint within the available time |

The recommendation can arrive earlier than the interruption warning, but there is no guaranteed extra interval. They can arrive together. A recommendation also does not promise that the instance will be reclaimed immediately. [EC2 rebalance recommendations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/rebalance-recommendations.html).

For stop or terminate behavior, the interruption notice normally gives approximately two minutes. Hibernation is different: hibernation begins immediately, without the two-minute advance window. Both the action and its timestamp matter. [Interruption notice documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html).

Do not derive a termination deadline by adding two minutes to a recommendation's `noticeTime`. It records when risk was reported, not a scheduled shutdown.

## Match Both EventBridge Event Types

Create a rule pattern for the account's default event bus in the Region where the instances run. This example collects both signals:

```json
{
  "source": ["aws.ec2"],
  "detail-type": [
    "EC2 Instance Rebalance Recommendation",
    "EC2 Spot Instance Interruption Warning"
  ]
}
```

Save it as `spot-signals-pattern.json` and create the rule:

```bash
aws events put-rule \
  --region us-east-1 \
  --name spot-capacity-signals \
  --event-pattern file://spot-signals-pattern.json \
  --state ENABLED
```

A rule alone does not process or retain events. Configure an appropriate target, its delivery permissions, retry handling, and a dead-letter queue where supported. A queue-backed handler can absorb short consumer outages, but a delayed message cannot restore the original two-minute shutdown window.

Use `detail.instance-id`, account, and Region to identify the machine. The interruption warning's `resources` ARN uses a special format involving the Availability Zone, so avoid requiring every event to contain an ordinary EC2 instance ARN.

## Route Events Through an Idempotent State Machine

Keep one record per instance lifecycle and retain the highest-severity state seen. For example:

```text
SERVING -> PREPARING -> DRAINING -> GONE
SERVING ------------> DRAINING -> GONE
```

A recommendation can move an instance to `PREPARING`. That transition might request an earlier checkpoint and ask the fleet manager for replacement capacity. An interruption warning moves it to `DRAINING` even if the recommendation never arrived.

A duplicate recommendation must not launch an additional replacement every time. A late recommendation must not move a draining worker back to serving. Record event IDs for diagnostics, but make the per-instance transition itself idempotent; two different events can still represent the same required action.

Choose one component to manage replacement capacity. If Auto Scaling Capacity Rebalancing already owns that responsibility, an application handler should focus on draining and checkpointing instead of independently increasing desired capacity for every signal.

## Check Instance Metadata Locally

An instance can also inspect both signals through IMDSv2. This one-shot diagnostic uses short timeouts and prints HTTP status separately from response content:

```bash
set -euo pipefail

SPOT_TOKEN=$(curl --silent --show-error --fail \
  --connect-timeout 1 --max-time 2 \
  -X PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')

for METADATA_PATH in events/recommendations/rebalance spot/instance-action; do
  printf '%s\n' "$METADATA_PATH"
  curl --silent --show-error \
    --connect-timeout 1 --max-time 2 \
    -H "X-aws-ec2-metadata-token: $SPOT_TOKEN" \
    -w '\nHTTP %{http_code}\n' \
    "http://169.254.169.254/latest/meta-data/$METADATA_PATH"
done
```

Run it on the instance, not your laptop. A 404 means the metadata item is absent at that moment. A timeout, 401, or 5xx response is a polling failure and must not be treated as proof that no interruption is pending.

For a production polling process, renew the token before expiry, parse successful JSON responses, check approximately every five seconds, and emit health metrics for poll failures. Keep event handling quick and move slow checkpoint work to a separate bounded operation.

## Make Draining Fit the Application

A queue worker should stop requesting messages, complete short in-flight work when possible, and checkpoint longer jobs to durable storage. Publish results with idempotency keys so another worker can safely retry after a sudden loss. Releasing a message before its partial side effects are recoverable can create duplicate or inconsistent work.

An HTTP server should stop receiving new requests through its traffic-management path and finish requests within a measured drain budget. Coordinate deregistration, connection handling, and application shutdown rather than assigning the full two minutes independently to each phase.

A lifecycle hook can coordinate Auto Scaling termination but cannot delay EC2 reclaiming Spot capacity. Plan for a late signal and for complete machine loss without a graceful exit.

## Validate Both Paths

Test a recommendation followed later by an interruption, simultaneous signals, an interruption without an earlier recommendation, and duplicate or out-of-order deliveries. Also test the application's recovery after abrupt worker loss; a system that passes only the graceful path remains vulnerable to missing notifications.

Record time from receipt to stopped scheduling, checkpoint completion, and replacement readiness. These measurements explain whether the application used its available time effectively and whether replacement delays came from capacity or bootstrap.

## Conclusion

Treat rebalance as advance risk information and interruption as a bounded recovery trigger. Keep the handler idempotent, give one component ownership of replacement, and make application correctness independent of receiving either notification in time.

## Official Documentation

- [EC2 rebalance recommendations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/rebalance-recommendations.html)
- [Spot interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [Auto Scaling lifecycle hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)
- [Auto Scaling Capacity Rebalancing](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html)
