# Validation summary

Reviewed each logging control as a source of different evidence. The article distinguishes total timing records, normalized SQL coverage, threshold selection and missing timing. It documents separate-record association without assuming that enabling all controls creates reliable counts.

## Sources reviewed

- https://www.postgresql.org/docs/18/runtime-config-logging.html#GUC-LOG-MIN-DURATION-STATEMENT
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://www.postgresql.org/docs/18/runtime-config-logging.html#GUC-LOG-DURATION
- https://pgbadger.darold.net/documentation.html
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://www.postgresql.org/docs/18/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
- https://github.com/darold/pgbadger/releases/tag/v13.3

## Checks performed

Started a disposable PostgreSQL 14.17 server with TCP disabled and a dedicated Unix socket. Fresh connections ran one fast SELECT and one SELECT pg_sleep(0.03) under seven settings combinations. Sampling was disabled. Saved each connection's raw log separately and stopped the cluster.

pgBadger 13.3 with Perl 5.34.1 produced the counts shown in the article table. Statement-only logs had two query groups but zero reported duration. Separate SQL/duration logs and all-three settings each produced four queries by default; --log-duration reduced both to two with preserved aggregate duration.

Ran the exact synthetic interleaved two-session fixture separately. Default parsing returned four queries and 42 ms; association returned two queries and 42 ms. Checked shell syntax and exact fixture correspondence. The six-node/six-edge Mermaid diagram passed structural checks. Generated and visually reviewed the 1280x720 social image; its three title lines fit.

## Limits

PostgreSQL 14.17 was an installed disposable test fixture, not a recommendation. PostgreSQL 18 semantics were source-reviewed but not executed on18. Tests used simple-query protocol and do not establish extended-protocol, prepared-query, pipelining, extension, other-format or production-load behavior. Local duration measurements are not performance benchmarks. Mermaid was checked structurally without browser rendering.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
