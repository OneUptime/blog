# Retry Partial Batches Without Reprocessing Successful Items

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Batch Processing, Retry, Backoff, Amazon SQS, AWS Lambda, Idempotency

Description: Track outcomes per record and retry only failed batch items while preserving idempotency, ordering, and bounded backoff.

---

Treating a batch as one success or failure unit is simple but expensive. If 99 records succeed and one fails, retrying all 100 repeats work, increases load, and can duplicate side effects.

Record each item outcome, acknowledge completed items, and schedule only the failures.

## Separate Attempt Execution from Batch Outcome

A batch handler needs a stable identifier for every item and a result for each one:

```typescript
type ItemResult =
  | { id: string; status: "succeeded" }
  | { id: string; status: "retry"; errorCode: string }
  | { id: string; status: "terminal"; errorCode: string };

async function processBatch(items: WorkItem[]): Promise<ItemResult[]> {
  return Promise.all(items.map(async (item) => {
    try {
      await processIdempotently(item.id, item.payload);
      return { id: item.id, status: "succeeded" } as const;
    } catch (error) {
      return classify(item.id, error);
    }
  }));
}
```

Do not let one rejected promise discard the successes already obtained. Classify permanent failures for a dead-letter path, and retain attempt state only for retryable items.

## Use Native Partial Failure Reporting When Available

AWS Lambda event source mappings for Amazon SQS support `ReportBatchItemFailures`. Once enabled, return only the failed message IDs:

```typescript
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    try {
      await processIdempotently(record.messageId, record.body);
    } catch (error) {
      if (isTerminal(error)) {
        await sendToApplicationDeadLetterStore(record, error);
      } else {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
  }

  return { batchItemFailures };
}
```

Without partial reporting, one handler failure makes every SQS message in the batch visible again after the visibility timeout. With it, Lambda treats the omitted IDs as successful and retries the reported failures.

Catch record-level exceptions and return a valid response. If the Lambda handler itself throws, AWS treats the entire batch as failed.

## Backoff Belongs to Each Failed Item

Partial failure reporting chooses what is retried; it does not by itself define a custom exponential schedule for every platform. Use the source's documented retry and visibility behavior, or move failures into a durable retry scheduler that stores:

```text
item_id, attempt_count, next_attempt_at, error_code, idempotency_key
```

Calculate and persist capped jitter separately for each failed item. Successful items must not retain a retry reservation or consume retry concurrency.

If the broker redelivers at least once, the item handler still must be idempotent. A worker can complete a side effect and crash before its acknowledgement becomes durable. Use a stable idempotency key or an atomic inbox record to recognize that replay.

## Preserve FIFO Ordering

Parallel item retries can violate ordered-stream semantics. AWS explicitly advises that for an SQS FIFO queue, the function should stop after the first failure and return both that failed message and all later unprocessed messages in `batchItemFailures`. That preserves the message group's order.

For partitioned systems, isolate ordering by key or partition. A failure for one key should not block independent keys unless the source contract imposes a global order.

## Bound Parallelism and Poison Items

`Promise.all` is suitable only for batches whose size and downstream capacity are already bounded. Otherwise use a concurrency limiter. Release its permit when an attempt finishes; a delayed retry should re-enter the scheduler later rather than occupy an active slot throughout backoff.

Set a maximum attempt count or item age and configure a dead-letter destination. Without a terminal path, one poison item can circulate indefinitely and dominate batch capacity.

Monitor item outcomes rather than only invocation outcomes. With partial responses, a Lambda invocation can be technically successful while returning several failed message IDs.

## Official Documentation

- [AWS Lambda SQS error handling and partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
- [Using AWS Lambda with Amazon SQS](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [AWS partial batch response best practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/lambda-event-filtering-partial-batch-responses-for-sqs/best-practices-partial-batch-responses.html)
- [AWS Lambda Powertools batch processing](https://docs.powertools.aws.dev/lambda/typescript/latest/features/batch/)

## Conclusion

Make success and failure item-level facts. Acknowledge completed records, persist backoff only for retryable failures, keep handlers idempotent, and preserve the source's ordering rules when deciding which later items can proceed.
