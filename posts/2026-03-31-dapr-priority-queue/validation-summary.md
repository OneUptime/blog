# Validation Summary: How to Implement Priority Queue with Dapr

## Status
validated

## Post Type
Tutorial / Pattern Guide

## Technologies Covered
- Dapr (pub/sub, state management, workflow)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Workflow Go SDK (`github.com/dapr/durabletask-go/workflow`)
- Apache Kafka (as pub/sub backend)
- Kubernetes (kubectl for deployment scaling)

## Sources Consulted
- Dapr Go SDK source code — `github.com/dapr/go-sdk/client/pubsub.go` for `PublishEvent` signature
- Dapr Go SDK source code — `github.com/dapr/go-sdk/client/state.go` for `SaveState` signature
- Dapr Go SDK source code — `github.com/dapr/go-sdk/service/common/type.go` for `TopicEvent` struct and `RawData` field
- Dapr Go SDK source code — `github.com/dapr/go-sdk/service/common/service.go` for `TopicEventHandler` signature
- Dapr Workflow SDK source code — `github.com/dapr/durabletask-go/workflow/activity.go` for `WithActivityInput` function
- Dapr Kafka pubsub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/

## Issues Found

### Issue 1: Incorrect workflow activity input function name
- **What was wrong:** `workflow.ActivityInput(task)` was used on lines 140, 146, and 151. The function `ActivityInput` does not exist in the `github.com/dapr/durabletask-go/workflow` package and would cause a compile error.
- **What was changed:** Replaced all three occurrences with `workflow.WithActivityInput(task)`, which is the correct function name.
- **Why:** The correct function is `WithActivityInput`, defined in `github.com/dapr/durabletask-go/workflow/activity.go`.

### Issue 2: Type mismatch in priority comparisons
- **What was wrong:** `task.Priority == int(PriorityCritical)` and `task.Priority == int(PriorityHigh)` on lines 139 and 144. Since `task.Priority` is of type `Priority` (a named `int` type) and `int(PriorityCritical)` converts to plain `int`, Go would reject this comparison as a type mismatch at compile time.
- **What was changed:** Changed to `task.Priority == PriorityCritical` and `task.Priority == PriorityHigh` respectively, comparing `Priority` values directly.
- **Why:** Go does not allow direct comparison between a named type and its underlying type without explicit conversion. The idiomatic approach is to compare values of the same named type.

## Review Notes
- The `handleLow` handler returns `(true, error)` on timeout, which signals Dapr to retry the message. This is semantically correct but worth noting that repeated retries could cause message redelivery storms under sustained load.
- The `processTask` function returns `(false, err)` when `doWork` fails, meaning the message will be dropped on error rather than retried. For critical tasks, users may want to return `(true, err)` to enable retry on failure.
- The state-based priority queue (Approach 2) shows `Enqueue` and `DequeueNext` but omits the `dequeueFromPriority` implementation. This is acceptable for a conceptual example but readers should note that implementing atomic dequeue with Dapr state requires additional consideration (e.g., ETags for concurrency control).
- The `common` package import is not shown in the consumer code snippet, though this is typical for blog post excerpts that focus on key logic.
