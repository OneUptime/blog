# How to Detect Breaking API Changes with Consumer-Driven Contract Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Contract Testing, Pact, CI/CD, Microservices, API Compatibility

Description: Use consumer-generated contracts, provider verification, and deployment checks to catch API changes that would break real integrations before release.

---

An API diff can tell you that something changed. It cannot, by itself, tell you whether a deployed consumer depends on that behavior. Consumer-driven contract testing records the interactions a consumer actually requires, verifies those expectations against the real provider implementation, and uses the verification matrix to decide whether particular versions are safe to deploy together.

Pact is a common implementation of this workflow. A consumer test talks to a Pact mock server and produces a pact file; the consumer build then publishes it. The provider build retrieves relevant pacts and replays each interaction against the provider. A Pact Broker stores contracts, verification results, version metadata, and deployment or release information so a `can-i-deploy` check can answer a version-specific compatibility question.

The mock test alone is not the proof. Provider verification against the same published contract closes the loop.

## Define “Breaking” from the Consumer's View

For a consumer that sends:

```http
GET /v1/products/p-42/price
Accept: application/json
```

and requires:

```json
{
  "currency": "GBP",
  "amountMinor": 1299
}
```

likely breaking provider changes include:

- removing or renaming the route;
- rejecting a header or query form the consumer sends;
- changing the success status the client branches on;
- removing `currency` or changing `amountMinor` from a number to a string;
- requiring a new request field the existing consumer does not send; and
- returning a different error shape that the consumer parses.

Adding an unrelated response field is usually compatible when the consumer's decoder tolerates it. Standard Pact matching ignores unexpected keys in JSON response bodies and cannot assert that a response key or header is absent, so it will not protect a strict decoder that rejects additional fields. Adding an optional request field is normally compatible. A broad schema-diff policy can still flag those changes for review.

This distinction is the value of consumer-driven contracts: compatibility is measured against executable usage, not guessed from the provider's entire theoretical surface.

## Write Consumer Tests Around Observable Behavior

The consumer test should exercise the real client adapter or service boundary, with only the provider replaced by the Pact mock. Define the smallest interaction that represents what the consumer needs:

- provider state, such as `product p-42 has a price`;
- method, path, relevant query, headers, and body;
- response status and required headers; and
- response fields and value shapes the consumer uses.

Then assert consumer behavior rather than merely asserting that the mock returned its own fixture. This callback shape uses Pact JS's `PactV3` interface:

```ts
await pact.executeTest(async mockServer => {
  const pricing = new PricingClient({ baseUrl: mockServer.url });
  const display = await pricing.displayPrice('p-42');

  expect(display).toBe('£12.99');
});
```

The surrounding Pact DSL is version-specific, so follow the implementation guide for the library version pinned in the repository. The important boundary is stable: the mock interaction must be registered before the request, the real consumer client must call the mock server, and a successful test writes the contract artifact.

Use matchers for variability. If `amountMinor` may be any integer and the consumer only requires it to remain an integer, use an integer matcher with a representative example. Use an exact value only when that exact value is behaviorally important. Overly exact timestamps, generated IDs, array lengths, and full-object equality create false breakages; matchers that are too broad can miss a real one.

Do not put real credentials, personal data, or production payloads in pact examples. Contracts are shared build artifacts and often retained.

## Use Provider States for Determinism

Pact provider states describe the preconditions for an interaction. During verification, the provider-side state handler creates the required data or configures a dependency before the HTTP request is replayed.

Good state names describe business conditions:

```text
product p-42 has a GBP price
product p-404 does not exist
account a-7 is suspended
```

Avoid names that prescribe implementation steps such as `insert row into prices`. Provider teams own how the condition is established. State setup must be repeatable, isolated by test, and cleaned up or made idempotent so parallel verification cannot leak data between interactions.

Provider verification should call the real routing, deserialization, validation, and response serialization; authentication and authorization may be exercised here or covered separately with a controlled substitute. Pact's provider guidance warns against stubbing above the layer where request bodies are extracted and validated; doing so can allow invalid payloads to pass verification. Stub downstream boundaries as needed, and contract-test those separately when they are services you control.

## Publish Contracts with Version Identity

Never overwrite a floating `latest.json` without source metadata. Publish each pact with an immutable consumer version, normally the commit SHA, plus its branch. Publish provider verification results with the provider version and branch that actually ran.

A minimal flow is:

```text
consumer commit
  -> run consumer tests
  -> publish pact + consumer version/branch
  -> trigger provider verification
  -> publish result + provider version/branch
  -> query compatibility for the target environment
  -> deploy/release
  -> record deployment/release
```

Branch and environment data matter. “This pact passed once” does not prove that the consumer being deployed was verified against the provider currently in production. Likewise, a provider build should be checked against all relevant consumer versions, not just the newest contract on one branch.

With the broker URL and credentials supplied through the CLI's environment variables, the current unified Pact CLI can run the deployment check with version and target environment information, for example:

```bash
pact broker can-i-deploy \
  --pacticipant checkout-web \
  --version "$CONSUMER_COMMIT" \
  --to-environment production
```

Run the equivalent check for a provider candidate. Use the CLI version pinned by your build and the current Pact Broker documentation; standalone or legacy clients use different executable names, and older tag-based workflows use different flags.

## Catch a Provider Breaking Change in CI

Suppose the provider changes:

```json
{ "currency": "GBP", "amountMinor": 1299 }
```

to:

```json
{ "currency": "GBP", "amount": "12.99" }
```

Provider verification replays the consumer interaction. The required `amountMinor` field is absent, so verification fails and publishes an incompatible result for that provider commit. The provider cannot safely deploy to an environment containing the affected consumer version until it restores compatibility or coordinates the rollout.

A safe expand-and-contract migration might be:

1. provider adds `amount` while retaining `amountMinor`;
2. provider verifies all relevant consumer contracts;
3. consumers migrate and publish new contracts that no longer require `amountMinor`;
4. new consumer versions are deployed or released and that environment information is recorded; and
5. provider removes `amountMinor` in a new candidate, verifies it against all relevant deployed or released-and-supported consumer contracts, and deploys it only when `can-i-deploy` passes.

Contract tests turn that coordination into evidence instead of a calendar guess.

## Detect Consumer-Side Breakage Too

A consumer change can become incompatible by sending a new enum value, omitting a formerly required field, changing media type, or expecting a new response field. Publish the candidate pact from the consumer branch and have the provider verify it before allowing the consumer to deploy.

Do not let a newly published, not-yet-verified pact silently block unrelated releases without a deliberate pending-contract workflow. Pact Broker features such as pending and work-in-progress pacts exist to introduce new expectations while still surfacing verification work. Configure them from the current official guidance and make ownership visible; do not turn “pending” into permanent ignoring.

## Avoid Common False Confidence

Several patterns produce green builds without meaningful protection:

- **Consumer test only:** proves the client works against the Pact mock, not the real provider.
- **Provider verifies a hand-edited fixture:** may not be the artifact the consumer generated.
- **Verification against an old deployment:** delays feedback and can publish results for the wrong provider version.
- **Exact matching of irrelevant fields:** makes irrelevant value changes or dynamic values look breaking.
- **Broad matching of required fields:** allows a type or structure the consumer cannot parse.
- **Missing provider states for stateful interactions:** makes tests depend on shared data and fail intermittently.
- **No deployment records:** leaves `can-i-deploy` unable to reason about what actually runs in an environment.
- **Generating “consumer” contracts only from OpenAPI:** validates a provider-authored description but does not capture independent consumer usage.

OpenAPI diffing and consumer-driven contracts complement each other. A schema diff covers unused or future public surface; consumer contracts provide executable evidence for known integrations. Neither replaces provider unit tests, security tests, performance tests, or a small number of end-to-end tests.

## Operate the Contract Suite

Assign stable participant names and one owner for each integration. Publish verification results from CI only, authenticate the broker with least privilege, retain enough history to diagnose rollouts, and prune abandoned branches deliberately.

When verification fails, report the consumer version, provider version, provider state, interaction description, exact mismatch, and broker matrix URL. Avoid dumping secrets or complete sensitive bodies. A failure such as `$.amountMinor expected integer but was missing` gives both teams a precise compatibility decision.

## Official Documentation

- [Pact: How Pact works](https://docs.pact.io/getting_started/how_pact_works)
- [Pact provider verification](https://docs.pact.io/provider)
- [Pact provider states](https://docs.pact.io/getting_started/provider_states)
- [Pact request and response matching](https://docs.pact.io/getting_started/matching)
- [Pact Broker](https://docs.pact.io/pact_broker)
- [Pact Broker `can-i-deploy`](https://docs.pact.io/pact_broker/can_i_deploy)

## Conclusion

Consumer-driven contract tests detect breakage by connecting an executable consumer expectation to verification against a specific provider version. Keep interactions minimal, state setup deterministic, versions immutable, and deployment metadata current. The resulting compatibility matrix lets teams evolve APIs independently while stopping releases that would break a real deployed consumer.
