# Validation summary

Reviewed native PostgreSQL JSON, CloudNativePG envelope records and Cloud Logging textPayload records as separate layouts. The tutorial preserves their metadata, avoids changing operator-owned logging settings, and treats retained coverage separately from parser success.

## Sources reviewed

- https://www.postgresql.org/docs/18/runtime-config-logging.html#RUNTIME-CONFIG-LOGGING-JSONLOG
- https://cloudnative-pg.io/docs/1.29/postgresql_conf/
- https://docs.cloud.google.com/sql/docs/postgres/logging
- https://cloudnative-pg.io/docs/1.29/logging/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- https://jqlang.org/manual/v1.7/
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://github.com/darold/pgbadger/blob/v13.3/README

## Checks performed

Executed pgBadger 13.3 with Perl 5.34.1 and jq 1.7.1 on synthetic native, CloudNativePG and Cloud SQL fixtures. Each contained equivalent queries including a quoted identifier and multiline SQL. The three transformed streams each produced two queries, two normalized groups and 32 ms total duration.

Extracted and executed the exact article jq filters; outputs matched the tested streams. Generated the three HTML reports and checked both query forms were present. The Cloud SQL guard rejected empty, capped, unexpected-payload and non-array exports. Also parsed the release's own public Cloud SQL and CloudNativePG fixtures, obtaining positive query counts of one and400 respectively.

All shell blocks passed bash syntax checking. The six-node/five-edge Mermaid flow passed structural checks. Generated and visually inspected the 1280x720 social image; both title lines fit.

## Limits

Kubernetes and gcloud download commands were checked against official documentation, not run against live services. No cloud permissions, retention completeness, late arrivals or real pagination were tested. Fixtures cover selected shapes and escaping cases, not every possible provider payload or customized prefix. HTML was content-checked without browser rendering; Mermaid was checked structurally.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
