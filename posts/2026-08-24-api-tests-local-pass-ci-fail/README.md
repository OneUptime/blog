# Why Do API Tests Pass Locally but Fail in CI? Debugging URLs, Secrets, Clocks, and Shared State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, CI/CD, Playwright, GitHub Actions, Debugging, Test Isolation

Description: Diagnose CI-only API failures by making endpoints, credentials, time assumptions, and parallel test state explicit and observable.

---

When an API test passes locally and fails in CI, the assertion is often only the messenger. The two runs may call different URLs, use different credentials, observe different clocks, or collide through shared data when CI enables parallel workers.

The fastest diagnosis is to compare a safe execution manifest before changing retries or timeouts. Record non-secret facts about the target origin, runtime, commit, worker, clock, and fixture identity. Then reduce the failure to one difference at a time.

## Prove Which URL the Test Actually Called

Local shells often have an `.env` file or a service already listening on `localhost`. A hosted runner starts clean. GitHub documents that, except for single-CPU variants, each GitHub-hosted runner is a new virtual machine. It does not inherit the developer's background processes or shell configuration.

Fail at configuration time instead of letting an absent variable become `undefined/v1/orders` or silently falling back to production:

```ts
function requiredUrl(name: string): URL {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is required`);

  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${name} must use HTTP or HTTPS`);
  }
  return url;
}

const apiBaseUrl = requiredUrl('API_BASE_URL');
console.info(JSON.stringify({
  apiOrigin: apiBaseUrl.origin,
  apiPathPrefix: apiBaseUrl.pathname,
}));
```

Log the origin and non-sensitive path prefix, not query credentials. Verify:

- scheme, host, port, and base path;
- whether the test runs on the VM host or inside a job container;
- whether a service container is reached by mapped localhost port or service hostname in that topology;
- DNS and certificate trust;
- IPv4 versus IPv6 resolution for `localhost`; and
- readiness before tests start.

Use an explicit readiness probe that checks an application-ready endpoint, not merely an open TCP port. Cap the wait and print the final safe response. A server can accept connections while migrations or dependencies are still unavailable.

Playwright supports `baseURL` in configuration and a `webServer` command for locally managed services. Make local and CI configuration flow through the same code:

```ts
import { defineConfig } from '@playwright/test';

const baseURL = requiredUrl('API_BASE_URL').toString();

export default defineConfig({
  use: { baseURL, trace: 'retain-on-first-failure' },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
});
```

A retry can collect evidence or identify flakiness, but it must not turn the first failure into an invisible success.

## Make Missing Secrets Fail Clearly

On a workstation, credentials may come from a keychain, shell profile, cached login, or `.env`. CI secrets have repository, organization, environment, event, and workflow permissions.

GitHub Actions specifically documents that secrets other than `GITHUB_TOKEN` are not passed to workflows triggered from forked repositories; secrets are also not automatically passed to reusable workflows. Referencing an unset secret expression yields an empty string.

Pass the secret explicitly to the test step and validate only presence and safe metadata:

```yaml
- name: Run API tests
  env:
    API_BASE_URL: ${{ vars.TEST_API_BASE_URL }}
    API_TOKEN: ${{ secrets.TEST_API_TOKEN }}
  run: npx playwright test tests/api
```

```ts
const token = process.env.API_TOKEN;
if (!token) throw new Error('API_TOKEN is unavailable for this workflow event');

console.info(JSON.stringify({
  tokenPresent: true,
  tokenLength: token.length,
}));
```

Do not log a prefix, hash, decoded claims, or the full token merely to distinguish credentials; even derivatives can leak useful information. Instead, call a safe identity endpoint and record non-sensitive account or role information if the API offers one.

Different credentials can legitimately see different tenants, feature flags, API versions, quotas, and data. A `404` may be authorization concealment rather than a missing fixture. Compare identity and scopes without exposing the credential.

If a test cannot run safely on an untrusted fork, skip it with an explicit annotation and run a secret-free contract suite instead. Do not switch to a more privileged event merely to expose secrets to untrusted code.

## Remove Clock and Time-Zone Assumptions

Clock-related CI failures commonly involve:

- server and test clocks on different machines;
- local time versus UTC;
- daylight-saving transitions;
- second-versus-millisecond units;
- timestamp precision or rounding;
- token expiry and not-before claims;
- date-only values parsed in different zones; and
- assertions that allow no network or scheduling delay.

Log timestamps as ISO 8601 UTC plus the source of each value:

```ts
console.info(JSON.stringify({
  testNow: new Date().toISOString(),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  tzEnv: process.env.TZ ?? null,
}));
```

For domain logic, inject a clock and set exact instants. For an integration assertion, compare within a justified interval based on request start and response end:

```ts
const before = Date.now();
const response = await request.post('/v1/jobs', { data: { kind: 'test' } });
const after = Date.now();
const createdAt = Date.parse((await response.json()).createdAt);

expect(createdAt).toBeGreaterThanOrEqual(before - ALLOWED_SERVER_SKEW_MS);
expect(createdAt).toBeLessThanOrEqual(after + ALLOWED_SERVER_SKEW_MS);
```

Do not solve a deterministic domain test with a large tolerance. Control time there. Use tolerance only where separate real clocks are part of the integration.

Set `TZ=UTC` when UTC is the application contract, but still add dedicated tests for supported user zones and daylight-saving boundaries. A global UTC setting can hide conversion bugs if local civil time matters.

## Assume CI Will Expose Shared State

Playwright runs test files in parallel worker processes by default. Its documentation says workers cannot share in-memory globals, while external state can still collide. Local runs may have fewer workers or a stable order and never reveal the race.

Common shared-state failures include:

- two tests create `user@example.com`;
- one test deletes a singleton another test reads;
- all workers reuse one idempotency key;
- cleanup removes data owned by another test;
- tests consume the same rate-limit bucket;
- one file assumes another file ran first; and
- multiple shards write one artifact path.

Derive unique values from test identity and a run identifier:

```ts
test('creates an order', async ({ request }, testInfo) => {
  const runId = process.env.GITHUB_RUN_ID;
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? '1';
  const run = runId ? `${runId}-${runAttempt}` : `local-${process.pid}`;
  const reference = `order-${run}-${testInfo.testId}`;

  const response = await request.post('/v1/orders', {
    data: { clientReference: reference, sku: 'sku-42' },
  });
  expect(response.status()).toBe(201);
});
```

Use a collision-safe encoding or hash if the API has length or character constraints. Clean up only records carrying the current run's ownership marker. Prefer API-supported namespaces or per-worker accounts over global database truncation.

Run the suspect test with one worker as a diagnostic:

```bash
npx playwright test tests/api/orders.spec.ts --workers=1 --repeat-each=10
```

If that passes while the parallel run fails, shared state is strong evidence, not a reason to leave CI serial forever. Fix isolation, then restore production-like concurrency.

## Compare the Complete Environment

Capture a safe manifest on both runs:

```json
{
  "commit": "...",
  "node": "...",
  "os": "linux",
  "architecture": "x64",
  "apiOrigin": "https://test-api.example",
  "apiVersion": "...",
  "timeZone": "UTC",
  "locale": "en-US",
  "workerCount": 4,
  "shard": "1/2",
  "containerDigest": "sha256:...",
  "databaseFixtureVersion": "..."
}
```

Also compare lockfile installation, runtime and TLS library, proxy variables, CA certificates, feature flags, migrations, service image digests, architecture, locale, and test command. Use immutable image digests and lockfile-respecting installs so “same commit” means the same dependencies.

GitHub's default variables include `CI=true`, workspace, run, job, ref, and SHA information. Use them for diagnostics and unique test data, but do not print the entire GitHub context; GitHub warns it contains sensitive information.

## Preserve the First Failure

Configure traces, structured request/response evidence, service logs, and test attachments before adding retries. Current Playwright trace options include retaining the first failure as well as tracing retries. The Trace Viewer can show request and response headers and bodies, so treat traces as sensitive artifacts with access controls and retention.

Redact authorization, cookies, API keys, signed URLs, and sensitive body fields. Prefer an allowlist of captured headers to a blacklist. Record body size and digest when the body itself is not safe.

For every failed API call, preserve:

- method and resolved URL without sensitive query values;
- safe request headers and bounded redacted body;
- response status, safe headers, and bounded redacted body;
- correlation or trace ID;
- request start, end, and timeout;
- fixture IDs and random seed; and
- execution manifest.

An `ECONNREFUSED` with resolved `127.0.0.1:3000` needs a different investigation from a `403` at the correct remote origin.

## Reproduce CI Locally

Print one sanitized reproduction command or container invocation in the artifact. Use the same test filter, worker count, shard, environment shape, runtime image, and service versions. Never embed a token in the command line or artifact; require the operator to supply it securely.

If exact local reproduction is impossible, add a short-lived diagnostic job that runs the isolated test with verbose safe logging and artifact capture in the same CI network. Remove extra logging once evidence is sufficient.

## A Practical Triage Order

Work in this order because each check is cheap and discriminating:

1. resolved method, URL, DNS, and readiness;
2. credential presence and safe identity/scopes;
3. request and response evidence with correlation ID;
4. commit, dependency, and service-image versions;
5. clocks, timezone, locale, and timestamp units;
6. worker count, shard, fixture uniqueness, and cleanup;
7. gateway, proxy, and certificate differences; and
8. only then timeout tuning or suspected product race conditions.

Increasing a timeout before proving the target and identity often makes the same misconfiguration fail more slowly.

## Official Documentation

- [GitHub Actions: Using secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [GitHub Actions variables reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [GitHub-hosted runners](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)
- [Playwright test configuration](https://playwright.dev/docs/test-configuration)
- [Playwright parallelism and test isolation](https://playwright.dev/docs/test-parallel)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)

## Conclusion

CI-only API failures become tractable when the test proves its resolved endpoint, credential context, clock assumptions, and data ownership. Fail fast on missing configuration, isolate every worker's external state, preserve a redacted first-failure artifact, and compare immutable environment versions. That evidence usually reveals a specific mismatch long before another retry or larger timeout would.
