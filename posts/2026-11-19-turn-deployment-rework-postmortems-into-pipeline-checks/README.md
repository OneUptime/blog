# How to Turn Deployment-Rework Postmortems into New Pipeline Checks and Release Guardrails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem Actions, CI/CD, SRE, Release Management, Testing

Description: Convert deployment-rework findings into reproducible assertions, enforced release checks, and owned guardrails with evidence of effectiveness.

A hotfix or rollback leaves a useful question for the postmortem: what observable condition could have stopped this failure before it required another deployment? Answering that question produces a specific control. Adding another approval checkbox rarely does.

The work is a chain: verified failure, reproducible assertion, appropriate pipeline stage, enforced decision, and continuing ownership. Google's [postmortem guidance](https://sre.google/workbook/postmortem-culture/) calls for tracked, prioritized actions with owners and verifiable end states. For release engineering, that end state should include evidence that the delivery path actually stops when the assertion fails.

## Preserve the mechanism that caused rework

Link the original deployment, incident, recovery deployment, and relevant configuration. Distinguish observations from hypotheses. A rollback followed by recovery establishes a useful association; it does not identify which change or operating condition caused the failure.

Consider an illustrative incident: a migration renamed an orders column while older application instances were still running. Tests of the new application passed, but old instances failed on reads and writes. Reverting the application did not restore the missing column, so recovery required another migration.

The missing assertion is precise: **after applying this migration, the currently supported application version can still execute its orders queries correctly**. “Improve migration testing” would leave too much undecided. AWS's [rollback-safety guidance](https://aws.amazon.com/builders-library/ensuring-rollback-safety-during-deployments/) explains why working old and new versions do not, by themselves, establish compatibility during forward and backward transitions.

## Turn the finding into a falsifiable check

Start with a small fixture that exercises the observed failure. Preserve the previous schema, representative data, and the affected old-version operation. Apply the candidate migration, then run that operation and check its result.

This Python 3 example uses SQLite and its [in-memory database support](https://docs.python.org/3/library/sqlite3.html). Save it as `ci/check_legacy_orders.py` in the application repository:

```python
import sqlite3
import sys
from pathlib import Path

with sqlite3.connect(":memory:") as db:
    db.executescript("""
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            total_cents INTEGER NOT NULL
        );
        INSERT INTO orders VALUES (1, 1200);
    """)
    db.executescript(Path(sys.argv[1]).read_text(encoding="utf-8"))

    # Operations retained from the supported old application version.
    db.execute("INSERT INTO orders(id, total_cents) VALUES (2, 500)")
    rows = db.execute(
        "SELECT id, total_cents FROM orders ORDER BY id"
    ).fetchall()
    if rows != [(1, 1200), (2, 500)]:
        raise SystemExit("Legacy orders contract changed")

print("Legacy orders contract passed")
```

Run it against the candidate SQL:

```bash
python3 ci/check_legacy_orders.py release/migration.sql
```

A migration containing `ALTER TABLE orders RENAME COLUMN total_cents TO amount_cents;` fails because the old operation references the removed name. An additive migration such as `ALTER TABLE orders ADD COLUMN amount_cents INTEGER;` passes this particular contract.

That passing result does not complete the rename design: new readers, backfill, concurrent writes, and eventual column removal need their own compatibility plan. The fixture detects one demonstrated failure. For a production gate, use the actual database engine and supported application artifacts, representative constraints, and the real migration sequence. SQLite cannot validate PostgreSQL locking or SQL semantics.

Retain both the failing and passing cases. If the known-bad migration ever passes, investigate the check before trusting subsequent green runs. Include missing migration input and changed query results among its failure cases.

## Put the check where the evidence exists

Choose the earliest stage that can reproduce the mechanism accurately:

| Observed failure | Suitable check placement |
| --- | --- |
| Invalid retry calculation | Fast application test before merge |
| File missing from a release package | Smoke test of the built artifact |
| Old application incompatible with migrated schema | Migration integration test before applying production migrations |
| Production-only latency regression | Bounded canary evaluation before expanding traffic |

For the migration example, run early checks on pull requests and repeat the release check using SQL extracted from the exact candidate artifact. Record its digest, baseline schema version, supported application versions, and test output. A passing check for yesterday's migration cannot authorize today's artifact.

When evidence requires production traffic, define an observation window, representative traffic minimum, service-health criteria, and behavior for missing data. Google's [canary guidance](https://sre.google/workbook/canarying-releases/) emphasizes attributable signals and the limits of test environments. A quiet canary with no relevant requests provides little evidence; pause promotion rather than treating silence as success.

## Verify enforcement separately from test correctness

A script returning nonzero is only part of a gate. In GitHub Actions, run the command without `continue-on-error` and make the deployment job depend on the compatibility job through `needs`. GitHub documents that [failed or skipped dependencies normally skip downstream jobs](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds).

Also configure the intended check as required for merges. Review triggering events and conditional execution: a skipped job can satisfy a required status check, while a filtered-out workflow can leave it pending. If an aggregate required job depends on other checks, make it run with `always()` and explicitly reject every dependency result except `success`. Include `merge_group` when using merge queues, as described in GitHub's [required-check troubleshooting guide](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).

Exercise the complete path in a test repository or nonproduction release: deliberately fail the assertion and verify that promotion stops. Repeat with a missing input, cancelled check, and skipped dependency. Check alternate release paths, including manual deployments. Preserve this enforcement evidence alongside the regression result.

## Give the guardrail an operational lifecycle

Assign an implementation owner and a continuing service or platform owner. Record the incident link, assertion, protected release paths, acceptance evidence, and review date in the existing action tracker. These are local tracking choices, not assumed CI-platform fields.

Define emergency exceptions before an incident: who may authorize them, the exact artifact and environment, reason, compensating controls, expiry, and retrospective review. An override records an accepted exposure; it must not rewrite a failed test as successful. Restrict the actual bypass mechanism to the designated authority.

At the review date, inspect valid blocks, false positives, overrides, added release time, and matching failures that escaped. Compare recurrence among relevant releases rather than relying on an aggregate rework-rate drop with changing release volume. Periodically replay the known-bad case.

Retire or replace the check when its compatibility window ends or the architecture changes, retaining the reason and replacement evidence. The useful outcome is a maintained control that catches a demonstrated failure at a consequential decision point, with its remaining limits understood.
