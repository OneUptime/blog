# Validation Summary: How to Set Up Integration Tests for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, pub/sub building block)
- Docker Compose (multi-container test environment)
- Redis Streams (message broker for local testing)
- Python (test code and subscriber service)
- Flask (subscriber HTTP server)
- pytest (test framework)

## Sources Consulted
- Dapr Publish API documentation: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr programmatic subscriptions: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr dead letter topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Redis Streams pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Docker Compose network_mode documentation: https://docs.docker.com/reference/compose-file/services/#network_mode
- Dapr self-hosted Docker Compose patterns: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/

## Issues Found

1. **Docker Compose: daprd sidecars unable to reach app containers (critical)**
   - **What was wrong:** The daprd sidecar containers (`publisher-dapr`, `subscriber-dapr`) ran in separate network namespaces from their app containers. Since daprd defaults to connecting to the app on `localhost`, it could not reach the app in a different container.
   - **Fix:** Added `network_mode: "service:publisher"` to `publisher-dapr` and `network_mode: "service:subscriber"` to `subscriber-dapr`, so each sidecar shares its app's network namespace. Also added `depends_on` to ensure correct startup ordering.

2. **Docker Compose: Dapr HTTP port not exposed to host (critical)**
   - **What was wrong:** The test runs from the host machine and publishes to `http://localhost:3500`, but port 3500 was not mapped to the host on any service.
   - **Fix:** Added `ports: - "3500:3500"` to the `publisher` service (since `publisher-dapr` shares its network namespace via `network_mode`).

3. **Test checks in-process list instead of querying subscriber (critical)**
   - **What was wrong:** The test defined a local `received_messages = []` list and polled it, but the subscriber runs in a separate Docker container. The test's in-memory list would never be populated, so the test would always fail.
   - **Fix:** Replaced the local list with HTTP polling against the subscriber's `/received` endpoint (`requests.get("http://localhost:8081/received").json()`). Added a `SUBSCRIBER_URL` constant.

4. **Subscriber: `received_messages` never defined (bug)**
   - **What was wrong:** The subscriber code referenced `received_messages.append(...)` but never declared the list.
   - **Fix:** Added `received_messages = []` and `dead_letter_messages = []` at module level.

5. **Subscriber: no endpoint to expose received messages for test verification (missing)**
   - **What was wrong:** The subscriber had no way for the test harness to query what messages it received.
   - **Fix:** Added `GET /received` and `GET /dead-letter-messages` endpoints that return the respective lists as JSON.

6. **Dead letter test: `dead_letter_messages` undefined (bug)**
   - **What was wrong:** The test referenced `dead_letter_messages` which was never defined in any accessible scope.
   - **Fix:** Changed the test to poll the subscriber's `/dead-letter-messages` HTTP endpoint with a deadline-based loop, matching the pattern of the main test.

7. **Dead letter: no subscription or handler configured (incomplete)**
   - **What was wrong:** The dead letter test assumed messages would reach a dead letter topic, but the subscription didn't configure `deadLetterTopic`, there was no subscription for the dead letter topic itself, and no handler existed.
   - **Fix:** Added `deadLetterTopic: "orders-deadletter"` to the orders subscription, added a second subscription for `orders-deadletter` with route `/dead-letters`, and added a `/dead-letters` POST handler in the subscriber.

8. **Dead letter: subscriber must return RETRY, not silently succeed (logic error)**
   - **What was wrong:** The subscriber always returned `SUCCESS`, so "FAIL_THIS" messages would never reach the dead letter topic. Messages only route to dead letter after RETRY exhaustion.
   - **Fix:** Added logic in the `/orders` handler to return `{"status": "RETRY"}` when `orderId` is `"FAIL_THIS"`, causing Dapr to retry until exhaustion and then route to the dead letter topic.

9. **Unused `import threading` (minor)**
   - **What was wrong:** The `threading` module was imported but never used in the test code.
   - **Fix:** Removed the unused import.

## Review Notes
- The Docker Compose `version: "3.8"` field is deprecated in Docker Compose V2 (Compose Specification). It still works but generates a warning. Future updates could remove it.
- The dead letter test uses a 15-second timeout to account for Dapr's retry backoff before messages reach the dead letter topic. The actual time depends on the Dapr resiliency policy configuration. For faster tests, a custom resiliency policy with fewer retries could be configured.
- The `daprio/daprd:1.14.0` image version is current as of the post date. Users should check for newer stable releases.
- The test approach of polling HTTP endpoints is pragmatic for a blog post but production integration tests would benefit from more robust patterns (e.g., test fixtures that reset state between tests, health check endpoints to verify Dapr readiness before running tests).
