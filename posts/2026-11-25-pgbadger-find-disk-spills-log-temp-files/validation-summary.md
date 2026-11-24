# Validation summary

Reviewed temporary-file events separately from statement count, live disk occupancy and query timing.

## Sources reviewed

- https://www.postgresql.org/docs/18/runtime-config-logging.html
- https://www.postgresql.org/docs/18/runtime-config-resource.html
- https://www.postgresql.org/docs/18/sql-explain.html
- https://www.postgresql.org/docs/18/sql-set.html
- https://www.postgresql.org/docs/18/functions-srf.html
- https://www.postgresql.org/docs/14/runtime-config-logging.html
- https://www.postgresql.org/docs/14/sql-set.html
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger

## Checks performed

Ran the exact SQL against an isolated PostgreSQL14.17 instance with no TCP listener. At64kB the plan used external merge and temporary blocks; server logs recorded1425408 and1400000-byte files. At8MB the same query used quicksort without additional file records. SHOW checks confirmed transaction-local settings reverted to4MB work_mem, disabled temp logging, zero statement timeout and two allowed parallel workers. Cleanup stopped the temporary instance.

pgBadger13.3 with Perl5.34.1 associated both file records with the multiline test statement and reported2825408 total bytes. Ordinary duration logging remained disabled, giving zero timed queries and zero sample duration; the article explains this missing timing evidence. The exact article parser command generated HTML after path substitution.

The six-node/five-edge diagram passed structural checks. Generated and visually inspected the1280x720 social image; its two title lines fit.

## Limits

The database test used an older14.17 lab runtime, disclosed in the article; PostgreSQL18 documentation was reviewed but that version was not executed. No production data, managed service, hash-spill workload or parallel-worker attribution was tested. File sizes and plan changes are fixture observations, not performance guarantees. HTML was not visually reviewed in a browser; Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
