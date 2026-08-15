# Persist Backoff State Across Worker Restarts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backoff, PostgreSQL, Workers, Job Queue, Persistence, Resilience

Description: Store retry attempts and due times durably so restarted workers preserve pacing and do not release a burst of failed jobs.

---

In-memory backoff disappears when a worker crashes, rolls out, or is rescheduled. If every restarted worker treats every failed job as attempt zero and immediately retries it, a routine deployment can create a retry storm.

Persist the job's failure streak and next eligible time as part of the queue state.

## Store Policy State with the Job

A PostgreSQL-backed queue can retain the minimum durable state:

```sql
CREATE TABLE retry_job (
    id uuid PRIMARY KEY,
    payload jsonb NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'running', 'done', 'dead')),
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    lease_token uuid,
    lease_until timestamptz,
    last_error_code text,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX retry_job_due_idx
    ON retry_job (next_attempt_at, id)
    WHERE status = 'pending';
```

Persist an absolute UTC due time because a process-local monotonic reading has no portable meaning after restart. Use monotonic clocks only after a worker has translated durable state into an in-process wait.

## Claim Due Work Atomically

Multiple workers can claim different rows with `FOR UPDATE SKIP LOCKED`:

```sql
WITH candidate AS (
    SELECT id
    FROM retry_job
    WHERE (status = 'pending' AND next_attempt_at <= clock_timestamp())
       OR (status = 'running' AND lease_until < clock_timestamp())
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
UPDATE retry_job AS job
SET status = 'running',
    lease_token = $1,
    lease_until = clock_timestamp() + interval '30 seconds',
    updated_at = clock_timestamp()
FROM candidate
WHERE job.id = candidate.id
RETURNING job.*;
```

PostgreSQL warns that `SKIP LOCKED` gives an inconsistent view for general queries, but explicitly notes its usefulness for avoiding contention among consumers of queue-like tables.

The random `lease_token` fences late completion from a worker whose lease expired and was reclaimed. Every success or failure update should require both `id` and the current token.

## Persist the Next Delay on Failure

Calculate a capped, jittered delay in application code, then update the count and due time in one transaction:

```sql
UPDATE retry_job
SET status = CASE WHEN attempt_count + 1 >= $3 THEN 'dead' ELSE 'pending' END,
    attempt_count = attempt_count + 1,
    next_attempt_at = clock_timestamp() + ($2 * interval '1 millisecond'),
    lease_token = NULL,
    lease_until = NULL,
    last_error_code = $4,
    updated_at = clock_timestamp()
WHERE id = $1
  AND lease_token = $5;
```

Persist the already-jittered `next_attempt_at`. If every worker recomputes the same deterministic delay after restart, jobs that failed together can synchronize again.

On success, atomically commit the business effect and mark the job done whenever they share a database. If they cannot share a transaction, make the effect idempotent and record a stable operation key.

## Restart Without Resetting the Queue

Startup logic should query due rows. It should not rewrite every `next_attempt_at` to now or reset `attempt_count`. Apply a global concurrency or rate limit even when many rows are already overdue, because an outage recovery or a forward wall-clock adjustment can make a large set eligible at once.

Use a lease-recovery path for jobs left in `running` state by a crashed worker. Preserve their attempt count, and decide whether lease expiry itself consumes an attempt based on whether the side effect might have started.

Clock corrections remain a concern for durable wall-clock schedules. Bound the number of claims per interval and reject implausibly distant timestamps. A database clock avoids disagreement among workers, while rate limiting limits the effect of a clock jump.

## Define Reset and Retention Rules

Reset `attempt_count` only after the unit of work commits successfully. Do not reset it merely because a worker restarted or reacquired a lease. Move permanently invalid jobs to `dead` without retrying, and retain enough diagnostic metadata to investigate without storing secrets or full sensitive payloads in error fields.

Useful metrics include due queue depth, oldest due age, attempts by error code, lease expirations, retry success rate, and jobs moved to `dead`.

## Official Documentation

- [PostgreSQL `SELECT` locking clause and `SKIP LOCKED`](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL date and time types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [PostgreSQL date and time functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [AWS guidance for limiting retries](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)

## Conclusion

Make the failure streak, selected due time, and lease durable queue state. Claim due rows atomically, fence stale workers, preserve state on restart, and meter overdue work so recovery does not become another outage.
