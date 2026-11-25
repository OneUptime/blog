# Validation summary

Reviewed raw samples, normalized grouping and application-source annotations separately.

## Sources reviewed

- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://www.postgresql.org/docs/18/sql-syntax-lexical.html#SQL-SYNTAX-COMMENTS
- https://google.github.io/sqlcommenter/

## Checks performed

Ran pgBadger13.3 under Perl5.34.1. Five synthetic duration statements produced one default group and three retained-comment groups, with unchanged total5/15ms. Combining-C with--keep-comments removed the block annotations. The exact article generator ran under Python3.11.13 and refused an existing filename; shell report commands generated the stated HTML. JSON corroborated group counts1/2/2. Default raw samples still contained annotations.

Quoted annotation values became placeholders during normalization, so annotated callers collapsed. Twenty distinct request-comment identifiers created20 groups. Rendering a previously default-normalized binary with--keep-comments did not recover per-tag grouping.

The seven-node/six-edge diagram passed structural checking. Generated and visually inspected the1280x720 social image; three title lines fit.

## Limits

No live database, application driver, ORM, proxy or sqlcommenter middleware was tested. The SQL examples assume an existing orders table and were documentation-reviewed, not executed. No production rollout, cardinality benchmark, all-comment-grammar coverage or anonymization guarantee is claimed. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
