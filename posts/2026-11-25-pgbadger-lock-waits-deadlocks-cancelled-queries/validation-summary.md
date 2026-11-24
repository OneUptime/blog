# Validation summary

Reviewed lock waits, deadlocks and cancellation reasons as distinct evidence.

## Sources reviewed

- https://www.postgresql.org/docs/18/explicit-locking.html
- https://www.postgresql.org/docs/18/runtime-config-locks.html
- https://www.postgresql.org/docs/18/runtime-config-client.html
- https://www.postgresql.org/docs/18/runtime-config-logging.html
- https://www.postgresql.org/docs/18/functions-info.html
- https://www.postgresql.org/docs/18/monitoring-stats.html
- https://www.postgresql.org/docs/18/errcodes-appendix.html
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger

## Checks performed

Created an isolated PostgreSQL14.17 instance without a TCP listener. Produced a resolved table-lock wait, a lock-timeout error, a statement-timeout error and a two-session row deadlock. The exact article blocker query identified the waiting application and expected holding process. Test transactions were rolled back and the temporary cluster stopped.

Parsed captured logs with pgBadger13.3/Perl5.34.1. Text and HTML preserved the wait/acquire information, timeout reasons, deadlock details and associated statements. An initial expectation of one headline cancellation failed: the HTML figure was zero despite the detailed statement-timeout event. Follow-up content assertions verified that discrepancy, which the article explains rather than treating the headline as a complete cancellation census. The exact article parser invocation generated HTML with only paths adapted. SHOW commands were documentation-reviewed, not separately executed in this lab.

The four-node/four-edge cycle passed structural checks. Generated and visually inspected the1280x720 social image; three title lines fit.

## Limits

The runtime test used the explicitly disclosed older14.17 lab version, not PostgreSQL18. No production sessions, prepared transactions, parallel groups, user-requested cancellation, retries or administrative termination were tested. The cancellation headline limitation remains; this is not an assertion that every parser statistic is correct. HTML was not visually reviewed in a browser; Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
