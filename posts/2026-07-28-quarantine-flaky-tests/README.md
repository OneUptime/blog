# How to Quarantine Flaky Tests Without Training the Team to Ignore Red Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Test Automation, CI/CD, Flaky Tests, Playwright, Pytest

Description: Move proven flaky tests into an owned, expiring, continuously executed quarantine lane while keeping stable required checks trustworthy.

---

A flaky test produces different results for the same relevant inputs. It may fail and then pass without a code change. Requiring it on every pull request blocks healthy changes; blindly retrying it makes green lose meaning.

Quarantine should be a short-lived workflow state, not a synonym for skip. The test continues to run, its failures remain visible, and an owner is accountable for removing the flake.

## Prove It Is Flaky

Do not quarantine every inconvenient failure. First distinguish:

- a deterministic product regression;
- a test that depends on an undeclared input;
- an environment outage;
- a capacity or timeout problem;
- order dependence or leaked state;
- genuine nondeterminism.

Preserve the first failure's logs, seed, shard, worker, timing, screenshots, traces, and environment. Retry the same test with the same source and configuration. Playwright classifies a test as "flaky" when it fails initially but passes on retry; this is useful evidence, not proof of root cause.

Run repetition and order changes:

```bash
npx playwright test tests/checkout.spec.ts --repeat-each=20
pytest tests/test_checkout.py::test_submit -x
```

Record a failure rate over enough attempts. A one-time service outage may need infrastructure remediation rather than test quarantine.

## Create an Explicit Quarantine Record

Every quarantined test needs:

- stable test identifier;
- issue URL;
- owner;
- date added;
- observed failure signature and rate;
- reason it is believed flaky;
- impact and risk;
- expiry or review date;
- exit criteria.

Keep metadata next to the test or in a reviewed manifest:

```yaml
tests/checkout.spec.ts::submits order:
  issue: ENG-4821
  owner: payments
  expires: 2026-08-11
  signature: "spinner remains visible"
```

CI should reject missing owners, invalid issue links, and expired entries. An expiry does not automatically delete the test; it turns neglect into an actionable pipeline failure.

## Tag, Do Not Permanently Skip

With pytest, register a strict custom marker:

```toml
[tool.pytest.ini_options]
addopts = "--strict-markers"
markers = [
  "quarantine: flaky test tracked by an active issue",
]
```

Then:

```python
import pytest

@pytest.mark.quarantine
def test_checkout_submit():
    ...
```

The stable lane runs:

```bash
pytest -m "not quarantine"
```

The quarantine lane runs:

```bash
pytest -m quarantine
```

Pytest's registered markers and `-m` expressions support this separation. `xfail` is intended for an expected failure such as a known bug; a nondeterministic test that sometimes passes is better tracked as quarantine so unexpected outcomes are measured explicitly.

With Playwright, add an `@quarantine` tag and use `--grep-invert @quarantine` versus `--grep @quarantine`. Avoid `test.skip()` or `test.fixme()` for an active quarantine because those annotations do not run the test. An annotation with the issue URL can keep ownership visible in reports.

## Build Two CI Signals

### Stable required gate

Runs non-quarantined tests and must stay trustworthy. A red result means the commit needs attention. Do not add unconditional retries to make it green.

### Quarantine health lane

Runs every quarantined test on every relevant commit or at a high-enough scheduled frequency. It uploads diagnostics and records each attempt. It is not a merge-blocking check for each known failure, but it must generate an actionable alert and feed a visible health dashboard.

The quarantine lane itself can have a required policy check that fails for governance conditions:

- a new quarantine without approval;
- an expired entry;
- no executions in the expected window;
- failure rate above an agreed budget;
- an unknown failure signature;
- total quarantined count over the cap.

This keeps "known flake failed again" from blocking every pull request without turning the entire lane into ignored permanent red.

## Use Retries as Measurement

Retries answer whether a failure is intermittent and can capture a trace on the first retry. They do not fix the test.

For Playwright:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  use: {
    trace: 'on-first-retry',
  },
});
```

Report first-attempt failures separately even if the retry passes. A green required gate that hides 50 retry recoveries is operationally red.

Use small retry counts. Multiple retries can turn a 20% pass probability into frequent apparent success while multiplying runtime. Never retry destructive integration tests unless their setup, action, and cleanup are idempotent and isolated.

## Keep the Main Check Present

If a required GitHub workflow is skipped entirely by path filtering, its expected check can remain pending and block merging. A conditionally skipped job reports success. Design one stable required gate that always reports and verifies that the correct stable test selection ran.

Also assert that tests were collected. A typo in a marker expression that selects zero tests must not create a false green result. Use the test runner's collection reporting and an expected minimum or manifest comparison.

## Fix the System, Not Only the Assertion

Common flake sources include:

- fixed sleeps instead of observable readiness;
- shared database rows, ports, users, or files;
- time, timezone, random seed, and locale;
- test-order dependence;
- eventual consistency without bounded polling;
- non-retrying UI assertions;
- leaked processes and browser contexts;
- CPU or memory starvation;
- mutable external services;
- ambiguous selectors.

Playwright recommends auto-retrying web assertions for asynchronous UI state and warns that merely increasing timeouts is often not the solution. Use observable conditions, unique test data, isolated resources, deterministic clocks/seeds, and cleanup that targets only the test's namespace.

## Define the Exit Procedure

A fix should:

1. reproduce the original failure reliably or explain its mechanism;
2. add the synchronization or isolation change;
3. run the test repeatedly under stress and varied ordering;
4. remove the quarantine marker and metadata;
5. restore it to the required stable lane;
6. watch first-attempt reliability for a defined period.

If a quarantined test begins passing consistently without a known fix, do not silently delete the entry. Investigate environmental changes, then restore it with monitoring. Unexpected passes are useful evidence.

## Limit Quarantine Capacity

Set a numerical and age budget:

- maximum count or percentage of suite;
- maximum days in quarantine;
- maximum allowed first-attempt failure rate;
- team-level ownership dashboard;
- weekly triage;
- escalation for expired high-risk tests.

Prioritize by product risk and developer cost. A flaky payment assertion deserves faster repair than a cosmetic visual check, even if failure rates match.

Do not let teams meet the cap by deleting coverage. Removal requires a documented decision that the behavior is tested elsewhere or no longer required.

## Monitor the Right Metrics

Track:

- first-attempt pass rate;
- pass-after-retry count;
- age and owner of each quarantine;
- unique failure signatures;
- time lost to retry;
- flakes per runner, shard, browser, and environment;
- rate of fixed tests returning to stable;
- escaped regressions in quarantined behavior.

Publish a concise trend, not a wall of ignored failure notifications. Route an incident to the owning team when a known signature changes or a budget is exceeded.

Quarantine works only when it protects the meaning of the main green check while making flaky behavior harder—not easier—to forget.

## Official Documentation

- [Playwright test retries](https://playwright.dev/docs/test-retries)
- [Playwright test annotations and tags](https://playwright.dev/docs/test-annotations)
- [Playwright auto-retrying assertions](https://playwright.dev/docs/test-assertions)
- [Playwright trace viewer](https://playwright.dev/docs/trace-viewer-intro)
- [pytest custom markers](https://docs.pytest.org/en/stable/example/markers.html)
- [pytest marker configuration and strict markers](https://docs.pytest.org/en/stable/reference/reference.html)
- [pytest skip and xfail](https://docs.pytest.org/en/stable/how-to/skipping.html)
- [GitHub status checks](https://docs.github.com/en/pull-requests/reference/status-checks)
