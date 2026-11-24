# Validation summary

Reviewed the distinction between selective event logging and complete query timing. The article explains per-file and duration thresholds, the dual role of deadlock_timeout, background records, privacy limitations and the difference between pgBadger HTML and text reports.

## Sources reviewed

- https://www.postgresql.org/docs/18/monitoring-stats.html
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://www.postgresql.org/docs/18/runtime-config-locks.html
- https://www.postgresql.org/docs/18/functions-info.html#FUNCTIONS-INFO-SESSION
- https://www.postgresql.org/docs/18/runtime-config-logging.html#GUC-LOG-TEMP-FILES
- https://www.postgresql.org/docs/18/runtime-config-vacuum.html
- https://www.postgresql.org/docs/18/runtime-config-logging.html#GUC-LOG-AUTOVACUUM-MIN-DURATION
- https://www.postgresql.org/docs/18/runtime-config-logging.html#GUC-LOG-CHECKPOINTS
- https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-SIGNAL
- https://www.postgresql.org/docs/18/view-pg-settings.html
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger

## Checks performed

Executed a fresh PostgreSQL 14.17 cluster with TCP disabled and isolated socket/data directories. Generated a real table lock wait, two temporary files, an automatic vacuum and analyze, and an explicit checkpoint. Ordinary statement-duration logging was disabled. Shutdown generated a second checkpoint and stopped the cluster.

The article blocker query identified the blocked reader. Extracted and applied the exact routine configuration, requested reload, and queried the exact settings list in a fresh session. Verified expected units and values, including 10240 kB and 1000 ms, with no pending restart.

Ran pgBadger 13.3 with Perl 5.34.1. Text output contained lock/temp details and zero timed queries. HTML content contained one automatic vacuum, one automatic analyze and two checkpoints. Checked the text-output implementation against the observed missing sections.

Shell syntax passed. The five-node/four-edge Mermaid diagram passed structural checks. Generated and visually inspected the 1280x720 social image; all three title lines fit.

## Limits

PostgreSQL 14.17 is a disposable local fixture, not a recommended version. PostgreSQL 18 documentation was reviewed but that version was not executed. Diagnostic thresholds were lowered only in the isolated test; routine settings were then reloaded and checked. No production overhead, managed service or external log transport was tested. HTML was content-checked without browser rendering; Mermaid was checked structurally.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
