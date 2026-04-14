# Validation Summary: How to Use Dapr Service Invocation for Async Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, pub/sub, workflow building blocks)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Go (goroutines, net/http, encoding/json)
- Pub/Sub messaging patterns (fire-and-forget, request-reply)

## Sources Consulted
- Dapr Go SDK source code and API reference (`github.com/dapr/go-sdk`)
- Dapr Go SDK `client.Client` interface — `InvokeMethodWithContent`, `PublishEvent` signatures
- Dapr Go SDK `service/common` package — `TopicEvent`, `TopicEventHandler`, `Subscription` types
- Dapr Go SDK `service/grpc` package — `NewService` function
- Dapr subscription model documentation (programmatic vs declarative subscriptions, startup-time registration)
- Dapr Workflow SDK (`github.com/dapr/durabletask-go/task`) — `WorkflowContext`, `WithActivityInput` API

## Issues Found

### Issue 1: Pattern 3 — Dynamic subscription at runtime (Critical)
**What was wrong:** The caller code used `s.AddTopicEventHandler()` dynamically at request time to subscribe to a per-correlation-ID reply topic (e.g., `orders.reply.<uuid>`). Dapr subscriptions are registered at startup when the sidecar queries `/dapr/subscribe` and are fixed for the lifetime of the service. `AddTopicEventHandler` cannot meaningfully add subscriptions after `s.Start()` has been called — the Dapr sidecar will never learn about the new subscription, so no messages would be routed to it.

**What was changed:** Rewrote the caller to register a single `orders.reply` topic subscription at startup, with a `pendingRequests` map keyed by correlation ID and Go channels for routing replies. Added explanatory text noting that Dapr subscriptions are startup-time only. Updated the sequence diagram to show subscriptions happening at startup (before request time). Removed `replyTopic` field from the request payload since a fixed reply topic is now used.

**Why:** This is a fundamental misunderstanding of Dapr's subscription lifecycle that would cause the pattern to silently fail at runtime — published replies would never be delivered to the caller.

### Issue 2: Pattern 3 — Processor using dynamic reply topic
**What was wrong:** The processor read `replyTopic` from the request and published the reply to that per-correlation dynamic topic. This worked in conjunction with the incorrect dynamic subscription approach.

**What was changed:** Removed the `replyTopic` extraction and changed the processor to publish to the fixed `orders.reply` topic instead.

**Why:** Aligns with the corrected caller approach using a shared reply topic.

### Issue 3: Pattern 4 — Incorrect workflow API function name
**What was wrong:** `workflow.ActivityInput(input)` was used to pass input to `CallActivity`. The Dapr workflow SDK uses Go's functional options pattern, and the correct function name is `WithActivityInput` (with the `With` prefix).

**What was changed:** Changed `workflow.ActivityInput(input)` to `workflow.WithActivityInput(input)` in both `CallActivity` calls.

**Why:** `ActivityInput` does not exist as a function in the Dapr SDK; the correct name following Go conventions is `WithActivityInput`.

## Review Notes
- The workflow code (Pattern 4) does not show imports, so the exact package path (`github.com/dapr/go-sdk/workflow` vs `github.com/dapr/durabletask-go/task`) is left implicit. The types and method names (`WorkflowContext`, `GetInput`, `CallActivity`, `Await`) are correct.
- Error returns from `json.NewDecoder().Decode()`, `json.Unmarshal()`, and `daprd.NewService()` are ignored throughout the snippets. This is acceptable for tutorial brevity but should not be replicated in production code.
- The `TopicEventHandler` return value `(false, nil)` is correct — `false` (retry) is only evaluated when `err != nil`, so returning `false, nil` is equivalent to a successful acknowledgement.
- Pattern 1's fire-and-forget goroutine (`go processOrderAsync(order)`) works correctly because `order` is a value type copied into the goroutine, but production code should manage goroutine lifecycle (e.g., worker pools, graceful shutdown).
- The overview and summary correctly distinguish between "three main approaches" (patterns 1-3) and Dapr Workflow as an additional orchestration option.
