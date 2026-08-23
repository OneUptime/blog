# Chain API Requests Without Making Tests Order-Dependent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Testing, Test Automation, Postman, CI/CD

Description: Keep create-update-read API workflows inside isolated scenarios so tests can run alone, in parallel, in any order, and on retry.

---

Many useful API tests require more than one request. A test may create an account, add a project, update it, verify the new representation, and finally delete it. Those requests are legitimately dependent because they describe one behavior.

The problem begins when each step becomes a separate test and the suite assumes those tests run in order. Then `test update` depends on an ID produced by `test create`, and `test delete` depends on both. Running one test alone fails, a retry starts in the middle of the workflow, and parallel workers overwrite shared variables.

The governing rule is simple: requests inside one scenario may depend on earlier requests in that scenario; independently reported tests should not depend on one another.

## Distinguish Request Chaining from Test Chaining

Request chaining passes a value returned by one request into the next request:

```text
create resource -> capture returned ID -> update that ID -> read that ID
```

This is normal. The first response is a precondition for the next operation.

Test chaining spreads the same sequence across separately scheduled cases:

```text
test 1 creates -> test 2 assumes the ID exists -> test 3 deletes it
```

This is fragile because most modern runners can parallelize files, shard suites across machines, retry failed tests, or select one case by name. Playwright explicitly provides no ordering guarantee across test files and recommends isolated tests instead of serial groups. A collection runner can intentionally execute requests in sequence, but that collection workflow should be treated as one scenario when it has shared state.

## Put the Smallest Complete Workflow in One Test

Keep a chain only as long as needed to prove one behavior. The following Playwright example uses application-specific routes, but the lifecycle pattern applies to any HTTP client:

```typescript
import { test, expect } from '@playwright/test';

test('renaming a project is visible through the read API', async ({ request }) => {
  const uniqueName = `api-test-${crypto.randomUUID()}`;
  let projectId: string | undefined;

  try {
    const created = await request.post('/projects', {
      data: { name: uniqueName },
    });
    expect(created.status()).toBe(201);
    const project = await created.json();
    projectId = project.id;
    expect(projectId).toEqual(expect.any(String));

    const renamed = await request.patch(`/projects/${projectId}`, {
      data: { name: `${uniqueName}-renamed` },
    });
    expect(renamed.ok()).toBeTruthy();

    const read = await request.get(`/projects/${projectId}`);
    expect(read.ok()).toBeTruthy();
    expect(await read.json()).toEqual(
      expect.objectContaining({
        id: projectId,
        name: `${uniqueName}-renamed`,
      }),
    );
  } finally {
    if (projectId) {
      const cleanup = await request.delete(`/projects/${projectId}`);
      expect(cleanup.ok(), `cleanup failed with HTTP ${cleanup.status()}`).toBeTruthy();
    }
  }
});
```

The ID is a local variable, not an environment-global slot. The create response is checked before its body is trusted. Cleanup targets the returned ID and runs even if the update or read assertion fails.

Do not combine unrelated behaviors into one enormous journey. If create, rename, archive, restore, transfer, and delete have distinct policy rules, give each behavior its own independently created resource. Shorter scenarios isolate failures and make parallel execution safe.

## Move Repeated Setup into a Fixture, Not a Preceding Test

When many tests need a project, extract creation and cleanup into a fixture or factory. The test requests a resource and receives a complete handle:

```typescript
type ProjectFixture = {
  id: string;
  name: string;
};

async function createProject(request): Promise<ProjectFixture> {
  const name = `api-test-${crypto.randomUUID()}`;
  const response = await request.post('/projects', { data: { name } });
  if (response.status() !== 201) {
    throw new Error(`Project setup failed with ${response.status()}`);
  }
  return response.json();
}
```

Pair this with teardown registered immediately after successful creation. In pytest, a `yield` fixture can create a resource before `yield` and delete it afterward. In Playwright, custom fixtures can wrap `use()` in the same way. Keep one state-changing action per fixture where practical, because partial setup failures are easier to clean up safely.

## Pass Data Explicitly

Capture values from the response that created them. Do not rediscover the new resource with `GET /projects?sort=createdAt` and assume the first row belongs to the test. Another worker can create a row at the same time.

Prefer:

- returned resource IDs over list positions;
- local variables or fixture values over collection-global variables;
- unique external keys over fixed names;
- explicit function arguments over hidden process state; and
- structured resource handles over loosely related strings.

If the API uses a server-generated identifier but does not return it, follow the documented `Location` header or response contract. Avoid parsing an undocumented implementation detail.

## Scope State to the Narrowest Boundary

Use per-test state by default. Per-worker state can be reasonable for expensive immutable prerequisites, such as a dedicated tenant that contains no mutable test cases. If workers share a prerequisite, every child resource must still have a unique owner or namespace.

Avoid suite-wide mutable state. A shared account balance, queue, feature flag, or named project becomes a scheduling lock disguised as a fixture. If a workflow truly requires exclusive access, isolate an environment for it or mark the narrow workflow serial and document why. Serial execution should be an exception, not the mechanism that makes basic tests pass.

## Handle Asynchronous Transitions Within the Scenario

An update may return before a search index, projection, or background job reflects it. Keep the polling in the same scenario that initiated the change. Poll a documented read or status endpoint until the business condition is true or a bounded deadline expires.

Do not split `start export` and `verify export` into separate tests. Also do not use a fixed sleep. The scenario should own the operation ID, observe terminal success or failure, and clean up its resource.

## Preserve Useful Failure Evidence

Each step should fail with context before the next step runs. Record sanitized details such as:

- scenario and step name;
- method and route template;
- expected and actual status;
- resource ID created by this test;
- correlation or request ID; and
- response body when it contains no secrets.

If creation fails, do not emit a misleading update failure. If cleanup fails after the main assertion fails, report both while preserving the primary failure.

## Prove Order Independence

An order-independent suite should pass under these checks:

1. run every test by itself;
2. run files in a different order;
3. run with multiple workers;
4. shard across CI jobs;
5. retry only a failed case; and
6. run the same case twice concurrently.

Failures usually reveal a hidden shared variable, a fixed fixture name, an incomplete cleanup path, or a test that consumes another test's output. Fix the ownership boundary instead of pinning the execution order.

## Postman Workflow Guidance

Postman supports request sequencing and `pm.execution.setNextRequest()` for collection runs. Use that capability to represent one coherent workflow. Store values needed only for the current run in the narrowest suitable scope, use unique data, and clear temporary state. Do not make a separate collection or CI job assume another collection already populated an environment.

If a collection contains many independent scenarios, organize each scenario into a folder with its own setup, assertions, and cleanup. Execute the folders independently as a test of isolation before enabling concurrent CI jobs.

## Official Documentation

- [Playwright test isolation](https://playwright.dev/docs/browser-contexts)
- [Playwright fixtures](https://playwright.dev/docs/test-fixtures)
- [Playwright parallelism and test order](https://playwright.dev/docs/test-parallel)
- [Playwright API testing setup and teardown](https://playwright.dev/docs/api-testing#setup-and-teardown)
- [pytest fixtures and teardown](https://docs.pytest.org/en/stable/how-to/fixtures.html#teardown-cleanup-aka-fixture-finalization)
- [Postman custom collection run order](https://learning.postman.com/docs/tests-and-scripts/running-collections/building-workflows/)

## Conclusion

Chained API requests are reliable when the chain is one self-contained scenario that owns its inputs, returned IDs, assertions, and cleanup. Repeated setup belongs in fixtures, not earlier tests. With local state and explicit resource ownership, the suite can run alone, in parallel, in a different order, or on retry without changing its meaning.
