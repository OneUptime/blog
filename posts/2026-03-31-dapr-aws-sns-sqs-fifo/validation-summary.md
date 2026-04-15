# Validation Summary: How to Configure AWS SNS/SQS with FIFO Queues for Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, SNS/SQS component)
- AWS SNS (FIFO topics)
- AWS SQS (FIFO queues)
- AWS CLI
- AWS IAM
- Python (Dapr SDK)

## Sources Consulted
- Dapr SNS/SQS component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr components-contrib source code (snssqs.go, metadata.go) on GitHub
- AWS CLI SNS create-topic reference: https://docs.aws.amazon.com/cli/latest/reference/sns/create-topic.html
- AWS CLI SQS create-queue reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/create-queue.html
- AWS CLI SNS subscribe reference: https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- Dapr Python SDK source (client.py publish_event method)

## Issues Found

### 1. Fabricated metadata field `fifoMessageGroupField`
**What was wrong:** The component configuration used `fifoMessageGroupField` with value `"orderGroupId"`, implying a per-message metadata key mapping mechanism. This field does not exist in the Dapr SNS/SQS component. A search of the `dapr/components-contrib` source returned zero results for this field name.
**What was changed:** Replaced with `fifoMessageGroupID` (value `"orders"`), which is the real component-level metadata field that sets a static message group ID for all messages published through the component.

### 2. Non-functional per-message publish metadata
**What was wrong:** The Python example passed `orderGroupId` and `MessageDeduplicationId` via `publish_metadata`, claiming these controlled per-message FIFO ordering and deduplication. The Dapr SNS/SQS component does not read per-message group IDs or deduplication IDs from publish metadata. The message group ID is computed automatically or set via the static `fifoMessageGroupID` component field.
**What was changed:** Removed the non-functional `publish_metadata` parameter from the `publish_event` call. Updated the section title from "Publishing with Message Group ID" to "Publishing Messages" and rewrote the explanation to accurately describe component-level group ID configuration and content-based deduplication.

### 3. Invalid SNS `FifoTopic=true` attribute
**What was wrong:** The `aws sns create-topic` command included `FifoTopic=true` in the `--attributes` flag. Per AWS CLI documentation, `FifoTopic` is not a settable attribute for SNS topic creation. A topic becomes FIFO by having the `.fifo` name suffix.
**What was changed:** Removed `FifoTopic=true` from the `--attributes` flag.

### 4. `ContentBasedDeduplication` set to `false`
**What was wrong:** Both the SNS topic and SQS queue were created with `ContentBasedDeduplication=false`. Since the Dapr SNS/SQS component does not set per-message `MessageDeduplicationId` values, disabling content-based deduplication would cause publish failures (FIFO requires either content-based dedup or explicit dedup IDs on every message).
**What was changed:** Changed `ContentBasedDeduplication=false` to `ContentBasedDeduplication=true` for both the SNS topic and SQS queue creation commands.

### 5. Invalid AWS account ID format in ARN placeholders
**What was wrong:** All ARN examples used `123456789` (9 digits) as the account ID placeholder. AWS account IDs are 12 digits, making these technically invalid ARN formats.
**What was changed:** Updated all ARN placeholders from `123456789` to `123456789012` (12 digits).

## Review Notes
- The post's original design pattern (per-message FIFO group IDs for per-entity ordering) is a valid and useful AWS pattern, but it is not currently supported by Dapr's SNS/SQS component. The component only supports a static message group ID at the component level. Users needing per-entity ordering would need to create separate Dapr components per entity group or contribute per-message group ID support to the Dapr project.
- The `messageWaitTimeSeconds` is set to `20` (maximum long polling), which is a good practice for reducing empty receives and cost.
- The dead letter queue `orders-dlq.fifo` referenced in the component config is not created in the setup commands. Users should create this queue separately.
- The IAM policy covers core operations but may need `sqs:ChangeMessageVisibility` if Dapr extends visibility timeouts during processing.
