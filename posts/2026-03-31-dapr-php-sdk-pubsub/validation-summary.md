# Validation Summary: How to Use Dapr PHP SDK for Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr PHP SDK (`dapr/php-sdk`)
- Dapr Pub/Sub building block
- Dapr CLI
- PHP 8 (named arguments)

## Sources Consulted
- Dapr PHP SDK source code on GitHub (https://github.com/dapr/php-sdk) — verified `DaprClient`, `Subscription`, `CloudEvent`, and `App` class APIs
- Dapr PHP SDK `src/lib/Client/DaprClient.php` — confirmed `publishEvent()` method signature and parameters
- Dapr PHP SDK `src/lib/PubSub/` directory — confirmed available classes (`CloudEvent`, `Subscription`, `Subscriptions`, `Topic`, `Publish`)
- Dapr PHP SDK `src/config.php` — confirmed DI container subscription configuration pattern (`dapr.subscriptions`)
- Dapr official documentation (https://docs.dapr.io/) — confirmed Dapr CLI `publish` command flags and pub/sub subscription API contract

## Issues Found

### 1. Incorrect method name in description text (line 24)
- **What was wrong:** The text said "Use `DaprClient::tryPublishEvent`" but no such method exists in the SDK.
- **What was changed:** Corrected to "Use `DaprClient::publishEvent`" to match the actual SDK method name.
- **Why:** The code example already used `publishEvent()` correctly, but the descriptive text referenced a non-existent method.

### 2. Misleading `metadata` parameter in publishing example (line 45)
- **What was wrong:** The example passed `metadata: ['content-type' => 'application/json']` to `publishEvent()`. In the SDK, metadata is sent as query parameters to the Dapr sidecar (prefixed with `metadata.`), not as HTTP headers. The content type is controlled by a separate `$contentType` parameter (5th argument) which already defaults to `'application/json'`.
- **What was changed:** Removed the `metadata` parameter from the example to avoid confusion.
- **Why:** Passing `content-type` via metadata is redundant and misleading — it does not set the HTTP Content-Type header; it sends a query parameter to the sidecar.

### 3. Fabricated attribute-based subscription section (lines 52-75)
- **What was wrong:** The entire "Subscribing with Attribute-Based Routing" section used fabricated APIs:
  - `#[Subscribe]` attribute — does not exist in the SDK
  - `#[Topic]` attribute for routing — `Topic` class exists but is not a PHP attribute; it's a regular class used for publishing
  - `Dapr\PubSub\Subscribe` namespace — does not exist
  - `\Dapr\PubSub\CloudEvent::success()` — `CloudEvent` class has no `success()`, `retry()`, or `drop()` static methods
- **What was changed:** Replaced the section with the correct SDK approach using `App::create()` with DI container configuration and `Subscription` objects. Showed proper message acknowledgment via `['status' => 'SUCCESS']` response arrays.
- **Why:** The SDK uses programmatic subscription registration through the DI container (`dapr.subscriptions` config key), not PHP 8 attributes.

### 4. Incorrect summary text
- **What was wrong:** Summary referenced "attribute-based" registration and "CloudEvent success/retry/drop responses."
- **What was changed:** Updated to reference "programmatic" registration via `App` class and `Subscription` objects, and "SUCCESS/RETRY/DROP status responses."
- **Why:** Aligned with the corrected subscription approach used in the post.

## Review Notes
- The manual subscription registration section (raw HTTP `/dapr/subscribe` endpoint) is correct and provides a useful alternative for environments without the full SDK App framework.
- The dead letter topic configuration using `deadLetterTopic` field name is correct per the Dapr subscription API spec.
- The `dapr publish --publish-app-id` CLI flag is correct (not `--app-id`).
- The `DaprClient::clientBuilder()->build()` instantiation pattern is correct.
- The `publishEvent()` named parameters (`pubsubName`, `topicName`, `data`) match the SDK's abstract method signature exactly.
