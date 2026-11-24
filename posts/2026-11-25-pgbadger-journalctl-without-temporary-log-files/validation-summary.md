# Validation summary

Reviewed source selection, message-versus-wrapper parsing and command failure propagation as separate acceptance concerns. Examples are pinned to pgBadger13.3 and use an explicitly stated PostgreSQL prefix.

## Sources reviewed

- https://www.postgresql.org/docs/18/runtime-config-logging.html
- https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- https://www.freedesktop.org/software/systemd/man/latest/systemd.journal-fields.html
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html

## Checks performed

Executed pgBadger13.3 under Perl5.34.1 against a controlled journal-output producer. The built-in command appended short-iso and preserved quoted time arguments. Both wrapper and message-only paths recognized one timed query. Filters selected database PID81 rather than wrapper PID500 with the explicit prefix.

A producer emitted a valid record and exited42. The built-in command returned zero; a Bash3.2.57 pipeline with pipefail returned42 and preserved the previous published report. The successful pipeline then published a one-query text report. No raw-log copy was needed.

The Mermaid diagram passed six-node/five-edge structural checks. The generated1280x720 social image was visually inspected; its three title lines fit.

## Limits

No live Linux journal or PostgreSQL server was accessed for these tests. Service naming, journal permissions, storage, retention and rate limits are documentation-reviewed only. Controlled producer tests do not validate transport behavior or collection completeness. Runtime outputs were text reports; HTML output is supported by source but was not visually reviewed. The scheduled example assumes a private directory and serialized runs, and does not implement a durable cursor or content-quality gate. Mermaid was not browser-rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
