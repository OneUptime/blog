# How to Stop Mock APIs from Drifting Away from the Real Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Mock API, Contract Testing, Pact, OpenAPI, CI/CD

Description: Keep API mocks trustworthy by deriving them from versioned contracts and continuously verifying those same contracts against the real provider.

---

A mock API begins as a productivity tool and quietly becomes fiction. The consumer updates a saved response, the provider changes validation or serialization elsewhere, and both test suites stay green because neither checks the same contract against the other implementation.

The cure is not a more detailed hand-written fixture. Make the mock an executable view of a versioned contract, then verify that exact contract against the real provider in CI. A contract without provider verification can drift; provider verification without a consumer-owned expectation can miss what consumers actually use.

## Identify the Sources of Truth

Teams often have all of these at once:

- a provider implementation;
- an OpenAPI description;
- hand-written mock routes and JSON fixtures; and
- assumptions embedded in consumer code.

If each can change independently, drift is inevitable. Choose a workflow with explicit authority and feedback.

In a **consumer-driven workflow**, the consumer test configures a Pact mock from the interaction it needs and publishes the generated pact. The provider build verifies that pact against the implementation. The Pact Broker links versions and verification results:

```text
consumer behavior test -> generated pact -> provider verifier -> compatibility result
```

In a **provider-contract workflow**, the provider publishes a versioned OpenAPI description. Mock and client tooling consume that exact artifact, while a conformance test validates provider requests and responses against it:

```text
provider build -> versioned OpenAPI -> generated mock
              -> implementation conformance check
```

Both are useful and can coexist. The critical invariant is that the mock and the real-provider check consume the same immutable contract version.

## Remove Independent Hand-Written Responses

This route is easy to write and easy to forget:

```ts
app.get('/v1/accounts/:id', (_req, res) => {
  res.json({ id: 'a-1', name: 'Example', plan: 'pro' });
});
```

Nothing proves the provider accepts that path, returns those types, or still has `plan`. Replace long-lived freehand routes with one of:

- a mock server configured inside consumer contract tests;
- a mock generated at startup from a pinned OpenAPI artifact;
- a thin scenario layer whose bodies are validated against the contract; or
- a real provider sandbox for behavior that cannot be represented by the contract.

Keep scenario values for readability, but validate them during mock startup. A representative example is not automatically a valid instance merely because it sits beside a schema.

Fail fast on unknown operations, unexpected request bodies, and exhausted scenarios. A permissive catch-all mock that returns `200` for anything teaches the client that invalid requests work.

## Close the Pact Loop

With Pact, the consumer test should use the production client adapter against the Pact mock and assert consumer behavior. A successful test emits the interaction. The provider verifier then sets up the named provider state and sends the contract request through the provider's real HTTP boundary.

Pact matching rules let examples vary without weakening the required shape. Match an ID or timestamp by type or pattern when the consumer does not need the exact example. Match a literal enum, status, or header when behavior depends on it.

Provider states keep data deterministic:

```text
given account a-1 exists on the pro plan
when GET /v1/accounts/a-1
then 200 with the fields the consumer reads
```

During verification, create that state in an isolated fixture. Pact's provider guidance recommends verifying a locally running provider as part of its CI build and warns against stubbing above request extraction and validation. Otherwise the verifier can send malformed data while a high-level stub returns success.

Publish the pact with the consumer commit and verification with the provider commit. A broker compatibility check before deployment prevents a green result from an unrelated historical version being mistaken for current proof.

## Close the OpenAPI Loop

An OpenAPI-generated mock stays structurally aligned only if the description itself stays aligned. Publish the OpenAPI document from the provider release process and test the implementation against it:

- validate the description and resolve references using its declared OAS version and JSON Schema dialect;
- exercise operations against the provider with valid and invalid generated cases;
- validate real response status, media type, headers, and body against the described response;
- fail when an implemented route is missing from the description or a described critical route is absent from the build; and
- publish the contract with an immutable digest and provider version.

Pin consumers to a digest or release version rather than downloading an unqualified `latest` at test time. Otherwise yesterday's consumer commit can produce different mock behavior today.

OpenAPI describes interface shapes and serialization well, but not every temporal rule. OAuth flows, eventual consistency, idempotency retention, rate-limit accounting, webhook retries, and multi-step state transitions need explicit scenario tests or another contract mechanism.

## Validate Mock Scenarios at Startup

Every configured mock response should be checked against the response schema for its operation, status, and media type. Every expected request should use OpenAPI parameter serialization rules before body validation.

For each scenario, store provenance:

```json
{
  "contractDigest": "sha256:8c1f...",
  "operationId": "getAccount",
  "status": 200,
  "mediaType": "application/json",
  "scenario": "pro account"
}
```

Reject startup if the operation disappeared, the status is no longer described, the example is invalid, or a reference cannot be resolved. Surface the JSON Pointer and contract version in the error.

Do not validate only responses. A drifting mock often accepts request fields, enum values, content types, or authentication omissions that the provider rejects. Verify method, path, query/header/cookie serialization, media type, body, and required security setup.

## Test Behavior Beyond Shape

A schema-valid mock can still lie. Add stateful scenarios for behavior consumers depend on:

- `404` before creation and `200` after creation;
- conflict on duplicate business keys;
- stale `If-Match` rejection;
- idempotent replay;
- pagination termination;
- asynchronous status transitions; and
- documented error codes and problem bodies.

Implement the smallest deterministic state machine that serves the consumer test. Then run equivalent acceptance scenarios against the provider or capture them as consumer contracts. Do not simulate arbitrary undocumented provider internals.

Latency and failure injection are client-resilience tools, not evidence of provider behavior. Label synthetic `500`, timeout, truncated body, and disconnect modes as test scenarios so nobody mistakes them for a provider guarantee.

## Use Recording Carefully

Recording traffic can bootstrap examples, but a recording is not a maintained contract. It can contain expired tokens, personal data, unstable timestamps, one accidental response, and fields the consumer never uses.

If recording is used:

1. capture only an approved test environment;
2. redact secrets and sensitive data before persistence;
3. convert the recording into explicit schema or matcher expectations;
4. review which fields are behaviorally required;
5. version the resulting contract; and
6. verify it against the provider in CI.

Never replay a production capture blindly or commit authorization headers.

## Add Drift Gates to Both Pipelines

On a consumer pull request:

1. run behavior tests against the contract-backed mock;
2. publish a candidate contract with branch and commit identity;
3. request provider verification; and
4. require the relevant compatibility result before deployment.

On a provider pull request:

1. fetch relevant consumer pacts and/or the release OpenAPI description;
2. start the provider with isolated state handlers;
3. verify all relevant interactions and response schemas;
4. publish results for the exact commit; and
5. run the broker or release compatibility check.

Run a small end-to-end smoke suite against a deployed provider as a final wiring check. It should not replace fast contract verification, but it catches infrastructure, gateway, certificate, and deployment configuration that an in-process verifier may not include.

## Measure Drift Directly

Track useful signals rather than mock line count:

- age of the contract used by each mock;
- percentage of active consumer contracts verified by the current provider build;
- unverified candidate contracts;
- OpenAPI examples that fail their schemas;
- real responses that fail the published description;
- mock operations with no provider verification; and
- production incidents caused by undocumented API behavior.

Set an owner and expiry for temporary mock exceptions. A warning that remains optional forever is another form of drift.

## Official Documentation

- [Pact: How Pact works](https://docs.pact.io/getting_started/how_pact_works)
- [Pact provider verification](https://docs.pact.io/provider)
- [Pact provider states](https://docs.pact.io/getting_started/provider_states)
- [Pact matching](https://docs.pact.io/getting_started/matching)
- [Pact Broker](https://docs.pact.io/pact_broker)
- [OpenAPI Specification 3.2.0](https://spec.openapis.org/oas/v3.2.0.html)

## Conclusion

A trustworthy mock is not a second implementation maintained by memory. Generate or configure it from a versioned contract, verify that same artifact against the provider, and gate deployments on version-specific compatibility. Add explicit behavioral scenarios and a small real-provider smoke layer for promises schemas cannot express.
