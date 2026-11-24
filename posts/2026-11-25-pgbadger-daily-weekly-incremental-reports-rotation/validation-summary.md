# Validation summary

Reviewed progress state, daily binary data and HTML as separate parts of the incremental archive. The article states duplicate-input and late-arrival limits instead of promising universal deduplication.

## Sources reviewed

- https://github.com/darold/pgbadger/blob/v13.3/README
- https://raw.githubusercontent.com/darold/pgbadger/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://www.postgresql.org/docs/18/runtime-config-logging.html
- https://github.com/logrotate/logrotate/blob/3.22.0/logrotate.8.in
- https://github.com/util-linux/util-linux/blob/v2.41.2/sys-utils/flock.1.adoc

## Checks performed

Executed pgBadger13.3 under Perl5.34.1 against synthetic PostgreSQL standard-error logs in a dedicated local directory. Inspected only trusted generated binary files with Storable to verify query counts. First run2; repeat2; append3; simulated rotation4; rotation rerun4; compressed old archive rerun4. A late older record was skipped. A separate fresh archive supplied duplicate input copies and counted4 rather than2.

Verified daily pages for November23/24, ISO week48 HTML and the main index link. Rebuilt from retained binary data successfully. The exact --logfile-list interface rerun preserved total4. All shell snippets passed syntax checks. Linux flock options were checked against util-linux2.41.2 documentation.

The six-node/six-edge diagram passed structural checks. Generated and visually reviewed the1280x720 social image; all three title lines fit.

## Limits

No real database rotation, scheduler or Linux flock process was run. The local fixture simulates file replacement and compression; it does not establish every rotation policy, clock behavior, equal-timestamp boundary or multi-source ordering case. No production retention or backup operation was performed. HTML presence and links were checked without a browser. Mermaid was not browser-rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
