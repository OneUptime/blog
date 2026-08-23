# How to Clean Up API Test Data Without Deleting Another Parallel Test’s Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Testing, Parallel Processing, Test Automation, Database

Description: Give every parallel API test explicit ownership of its records, delete by returned ID, and use guarded sweepers only as a fallback.

---

Test-data cleanup becomes dangerous when parallel workers share an environment. A teardown such as delete every user whose email starts with `test-` may remove records another worker is still using. Truncating a shared table is worse: it ignores test ownership entirely and can block or erase unrelated work.

Safe cleanup is an ownership problem. Every test run needs a unique namespace, every created resource needs a recorded identity, and routine teardown should delete only resources that the same test or worker created. A separate, guarded sweeper can handle leftovers after crashes, but it should never replace precise ownership.

## Give Every Run and Worker a Unique Namespace

Create a run identifier once in CI, then derive a worker identifier and test identifier. Include enough entropy that concurrent pipelines cannot collide:

```text
runId    = repository + pipeline ID + attempt
workerId = runId + shard + worker index
testId   = workerId + random UUID
```

Use these values in resource names or supported metadata, for example `api-test-<testId>`. Playwright exposes `workerIndex` and `parallelIndex`; its official parallelism guide specifically recommends using worker identity to isolate data.

Names are useful for diagnosis, but returned resource IDs are the cleanup authority. A name prefix alone is not proof of ownership. Another run can use the same prefix, and user-entered data may coincidentally match it.

When the API supports labels, tags, or metadata, record `testRunId`, `testWorkerId`, and `createdAt`. When it does not, use a dedicated test tenant, account, project, schema, or environment. Never add test-only fields to a public production contract solely for cleanup without an explicit product decision.

## Record Exact Resources as Soon as Creation Succeeds

After each successful create request:

1. validate the response;
2. capture the authoritative returned ID or documented `Location` URI;
3. register the matching cleanup action immediately; and
4. only then continue setup.

Registering cleanup at the end of setup is too late. If the third of four create calls fails, the first two resources would have no teardown record.

A small LIFO ledger handles dependencies naturally:

```typescript
type Cleanup = {
  description: string;
  run: () => Promise<void>;
};

class CleanupLedger {
  private readonly actions: Cleanup[] = [];

  add(action: Cleanup) {
    this.actions.push(action);
  }

  async clean(): Promise<void> {
    const failures: string[] = [];
    for (const action of this.actions.reverse()) {
      try {
        await action.run();
      } catch (error) {
        failures.push(`${action.description}: ${String(error)}`);
      }
    }
    if (failures.length) {
      throw new Error(`Cleanup failures:\n${failures.join('\n')}`);
    }
  }
}
```

If a test creates a project and then a task, reverse-order cleanup deletes the task before the project. The ledger continues after one deletion fails and reports all cleanup failures rather than abandoning the remaining resources.

## Delete by ID and Verify the Ownership Boundary

Routine teardown should call a documented delete operation for the exact ID that setup returned. If a privileged cleanup API accepts both the ID and a test-run marker, require both to match. For direct database cleanup, include the run or tenant boundary in the predicate as defense in depth:

```sql
DELETE FROM api_test_resources
WHERE id = $1 AND test_run_id = $2;
```

The table and columns here represent a deliberately designed test-resource store, not a suggestion to add arbitrary production fields. Parameterize values through the database driver. Never build a deletion statement with string concatenation.

Do not clean up by list position, recent timestamp alone, broad prefix, or unqualified tenant. Avoid `TRUNCATE` in a shared parallel database. PostgreSQL documents that `TRUNCATE` takes `ACCESS EXCLUSIVE` locks and that `CASCADE` can include referencing tables, which makes the blast radius inappropriate for per-test teardown.

## Design Cleanup for Retries

HTTP defines `DELETE` as idempotent: multiple identical requests have the same intended effect, although their responses can differ. Your API may return success on the first deletion and `404` on a repeated cleanup. Treat only the responses documented by the API as successful cleanup outcomes.

This matters because cleanup may run after:

- a test timeout;
- a framework retry;
- a partially failed setup;
- a previous teardown whose response was lost; or
- manual recovery of a failed CI job.

Do not blindly retry every failed deletion. Authentication and authorization failures need immediate attention. A conflict may mean child resources must be removed first. A transient service failure may be retryable under a short, bounded policy.

## Keep Test and Cleanup Credentials Separate When Needed

Authorization tests often use a caller that is intentionally unable to delete a resource. Cleanup can use a tightly controlled test-environment service identity after the behavior assertion completes. Scope that identity to the dedicated test tenant or namespace, and keep it out of application request logs.

A powerful cleanup credential must not turn into a broad delete tool. Require the run marker, tenant, and exact resource ID. Production environments should normally be out of scope entirely.

## Account for Asynchronous Deletion

Some APIs mark a resource for deletion and remove it later. In that case, a successful delete response means the operation was accepted, not necessarily that dependent state has disappeared. Poll the documented resource or operation endpoint until the terminal deleted condition or a bounded deadline.

Before the test ends, verify only the postcondition the contract promises. For example, the API may return `404`, a tombstone state, or an operation status. A fixed sleep either wastes time or becomes flaky under load.

## Add a Guarded Sweeper for Crash Recovery

Framework teardown cannot run after every failure. A killed runner, lost VM, or process crash can leave data behind. Use a periodic sweeper as a second line of defense with multiple guards:

- operate only in explicitly configured test tenants or databases;
- require an unambiguous automation-owned marker;
- select records older than the maximum legitimate test duration;
- limit the number deleted in one invocation;
- support a dry-run report;
- log IDs, ages, tenant, and run IDs without secrets; and
- alert or stop when the candidate count is unexpectedly large.

The age threshold prevents the sweeper from deleting records that a slow but active parallel run still owns. If the API supports retention or TTL for disposable test resources, use it as another fallback, while still performing precise teardown for fast, deterministic suites.

## Test the Cleanup System

Cleanup code deserves its own cases:

- two concurrent runs with similar names delete only their own IDs;
- a setup failure after the first resource still cleans that resource;
- child resources are removed before parents;
- repeated cleanup is handled according to the API contract;
- one failed deletion does not skip later ledger actions;
- the sweeper ignores young resources and unmarked records;
- an unexpected candidate volume stops the sweeper; and
- logs contain no credentials or sensitive fixture payloads.

Also test reruns in the same environment. If a failed run's leftover unique key prevents a later run, either the namespace is not unique enough or the recovery policy is incomplete.

## Official Documentation

- [Playwright parallelism and worker data isolation](https://playwright.dev/docs/test-parallel)
- [Playwright fixtures](https://playwright.dev/docs/test-fixtures)
- [pytest fixture teardown](https://docs.pytest.org/en/stable/how-to/fixtures.html#teardown-cleanup-aka-fixture-finalization)
- [RFC 9110 Section 9.2.2 - Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9110 Section 9.3.5 - DELETE](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.3.5)
- [PostgreSQL TRUNCATE](https://www.postgresql.org/docs/current/sql-truncate.html)

## Conclusion

Parallel-safe cleanup requires explicit ownership. Namespace every run, capture exact IDs, register teardown immediately, and delete resources in reverse dependency order. Use a tightly guarded, age-aware sweeper only for crash recovery. Broad prefixes, global truncation, and shared mutable fixtures are not cleanup strategies; they are race conditions.
