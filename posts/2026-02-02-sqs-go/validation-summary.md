# Validation Summary: How to Use SQS with Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- Go (Golang) 1.21+
- AWS SDK for Go v2 (`github.com/aws/aws-sdk-go-v2`)
- `github.com/aws/aws-sdk-go-v2/config`
- `github.com/aws/aws-sdk-go-v2/credentials`
- `github.com/aws/aws-sdk-go-v2/service/sqs`
- `github.com/aws/aws-sdk-go-v2/service/sqs/types`
- `github.com/google/uuid`
- Go's `net/http`, `context`, and `sync` packages
- Mermaid diagrams (architecture, sequence, flowchart)

## Sources Consulted
- AWS SQS Developer Guide: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/
- AWS SQS API Reference (ChangeMessageVisibility, ReceiveMessage, SendMessage, SetQueueAttributes): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/
- AWS SDK for Go v2 SQS package docs: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/service/sqs
- AWS SDK for Go v2 SQS types: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/service/sqs/types
- AWS SDK for Go v2 config: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/config
- AWS SDK for Go v2 credentials: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/credentials
- SQS Dead-Letter Queue documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/SQSDeadLetterQueue.html
- SQS quotas (message size, batch size, retention): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-quotas.html
- SQS Long Polling docs: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html

## Issues Found

1. **Misleading documentation and parameter name for `ExtendVisibility`** — Fixed.
   - The original comment said the function "increases the visibility timeout" and the parameter was named `additionalSeconds`. This is incorrect: AWS's `ChangeMessageVisibility` API does not add to the existing timeout; it sets a new visibility timeout measured from the time of the call (per the SQS API reference). Renamed the parameter to `visibilityTimeout` and rewrote the comment to clarify that the value is the new timeout from "now", not an addition to the current timeout. The behavior of the code itself was correct — only the docs/naming were misleading.

2. **Misleading parameter name in `StartVisibilityHeartbeat`** — Fixed.
   - Same root issue: the parameter was named `extension`, implying additive semantics. Renamed to `visibilityTimeout` and updated the comment to describe the actual behavior (sets the visibility timeout to N seconds from each tick).

## Review Notes

- **`AttributeNames` field on `ReceiveMessageInput`** is technically deprecated in recent versions of `aws-sdk-go-v2/service/sqs` in favor of `MessageSystemAttributeNames` (typed `[]types.MessageSystemAttributeName`). The deprecated field is still present and functional, so the code as written compiles and works — but readers who run `go vet` or up-to-date linters will see a deprecation warning. Left as-is because it remains valid Go and matches commonly-cited examples; a future revision could switch to `MessageSystemAttributeNames` for full forward-compatibility.
- **`RedrivePolicy` `maxReceiveCount` value formatted as a quoted string (`"%d"`)** — AWS accepts both `"maxReceiveCount":5` and `"maxReceiveCount":"5"` for backward compatibility, and AWS's own SDK examples have historically used the quoted-string form. Left unchanged.
- The `receiveMessages` function pre-allocates `messages := make([]*Message, len(result.Messages))` and assigns via index, but `continue`s on unmarshal failure, which can leave nil entries that downstream workers would dereference. This is a robustness concern rather than a syntactic/API correctness issue, so it was not modified per the "fix only technical errors" scope; consider switching to `append` against a nil slice in a future revision.
- All AWS SDK v2 import paths, function signatures, field names, and types are correct as of mid-2026.
- All cited SQS limits are accurate: batch size of 10 messages, 256 KB payload, message retention default of 4 days (345 600 s) and max of 14 days (1 209 600 s), long-polling wait time 0–20 s, visibility timeout 0–43 200 s (12 h).
- FIFO queue naming requirement (`.fifo` suffix) and `FifoQueue=true` / `ContentBasedDeduplication=true` attributes are correct.
- The `messageRetention` parameter uses `int` rather than `int32`; this works because `strconv.Itoa` accepts `int`, but is mildly inconsistent with other timeout parameters typed as `int32`.
