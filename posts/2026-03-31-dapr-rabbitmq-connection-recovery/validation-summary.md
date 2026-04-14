# Validation Summary: How to Handle RabbitMQ Connection Recovery with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub component for RabbitMQ)
- RabbitMQ 3.12 (quorum queues, dead-letter queues, publisher confirms)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Docker Compose
- Kubernetes (secrets)
- rabbitmqctl / rabbitmqadmin CLI tools

## Sources Consulted
- Dapr RabbitMQ pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr Go SDK client documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr JavaScript SDK client documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Lazy Queues documentation: https://www.rabbitmq.com/docs/lazy-queues
- RabbitMQ Policies documentation: https://www.rabbitmq.com/docs/policies
- RabbitMQ 3.12 performance improvements blog post: https://www.rabbitmq.com/blog/2023/05/17/rabbitmq-3.12-performance-improvements
- RabbitMQ GitHub Discussion #11988 (queue type cannot be set via policy): https://github.com/rabbitmq/rabbitmq-server/discussions/11988

## Issues Found

### 1. `queue-type` cannot be set via `rabbitmqctl set_policy` (HIGH)
**What was wrong:** The post used `rabbitmqctl set_policy` with `"queue-type":"quorum"` in the policy definition. RabbitMQ explicitly rejects queue type in policies — queue type must be set at declaration time via the `x-queue-type` argument.
**What was changed:** Replaced the `rabbitmqctl set_policy` command with a `rabbitmqadmin declare queue` command that correctly sets the quorum queue type at declaration time using `arguments='{"x-queue-type":"quorum"}'`.

### 2. `queue-mode: lazy` irrelevant and deprecated (MEDIUM)
**What was wrong:** The policy included `"queue-mode":"lazy"` alongside the quorum queue setting. This is doubly incorrect: (a) `queue-mode` is a classic queue concept and has no effect on quorum queues, which always store data on disk; (b) `queue-mode` is deprecated and silently ignored in RabbitMQ 3.12, which is the version used in the post's Docker Compose.
**What was changed:** Removed `queue-mode: lazy` as part of the policy-to-declaration rewrite.

### 3. Incorrect Dapr metadata field name: `concurrency` should be `concurrencyMode` (MEDIUM)
**What was wrong:** The Dapr component configuration used `concurrency` as the metadata field name. The correct field name in the Dapr RabbitMQ pub/sub component is `concurrencyMode`.
**What was changed:** Renamed `concurrency` to `concurrencyMode` in the component YAML.

### 4. Go `defer client.Close()` inside retry loop — resource leak (MEDIUM)
**What was wrong:** The Go code example used `defer client.Close()` inside a `for` loop. In Go, `defer` statements execute when the enclosing function returns, not when the loop iteration ends. This means all client connections created during retries would leak until the function returns.
**What was changed:** Replaced the `defer client.Close()` with explicit `client.Close()` calls before `return` and before the next retry iteration.

## Review Notes
- The `reconnectWait` value of `"3"` is correct — Dapr's RabbitMQ component interprets this as 3 seconds (plain integer, not a duration string).
- The Dapr Go SDK `PublishEvent(ctx, pubsubName, topicName, data)` API is correct and current.
- The Dapr JS SDK `client.pubsub.publish(pubsubName, topic, data)` API is correct and current.
- The `rabbitmqadmin get` and `rabbitmqctl list_queues` commands for dead-letter queue monitoring are syntactically correct.
- The `DaprClient` constructor in the JS example uses the options-object form (`{ daprHost, daprPort }`) which is correct for the JS SDK v3.x.
- The `saveToOutbox()` function in the JS example is referenced but not defined — this is acceptable as a conceptual placeholder in a tutorial.
- The Docker Compose uses `version: '3'` which is deprecated in newer Docker Compose versions but still functional and widely used in tutorials.
