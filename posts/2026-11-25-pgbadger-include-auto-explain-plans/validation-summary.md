# Validation summary

Reviewed plan capture, parser inclusion and execution-count reconciliation.

## Sources reviewed

- https://www.postgresql.org/docs/18/auto-explain.html
- https://www.postgresql.org/docs/14/auto-explain.html
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger

## Checks performed

Executed the article SQL on a disposable PostgreSQL14.17 instance listening only on a temporary Unix socket. The temporary table held10000 rows; the filtered count returned1001. The logged text plan contained actual rows1001,8999 filtered rows and94 local buffer hits. Both duration thresholds returned to-1 after rollback. The instance stopped in finally and the temporary cluster was removed.

pgBadger13.3 under Perl5.34.1 generated HTML/JSON with one query despite the paired plan and ordinary duration messages. The default report retained the scan plan; --noexplain omitted it while preserving one-query count. Article SQL matches the executed SQL except the blank line separating its two blocks. Both exact parser commands were executed with local paths.

The seven-node/seven-edge Mermaid passed structural checks. Generated and visually reviewed the1280x720 image with two title lines.

## Limits

No PostgreSQL18 runtime, production overhead test, shared preload deployment, sampling/nested-query exercise or shipping pipeline was tested. Only text plans in plain stderr logs were exercised. The lab service name remains a placeholder; execution used explicit local socket arguments. No browser or external graphical-plan service was used, and Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
