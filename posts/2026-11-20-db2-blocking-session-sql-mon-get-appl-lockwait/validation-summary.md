# Validation review

Reviewed live requester/holder columns, member selection, remote-holder resolution, connection identity, and the distinction between current SQL and lock-acquiring SQL. MON_FORMAT_LOCK_NAME returns name/value rows, not TABNAME/TABSCHEMA columns.

## Checks

Extracted SQL examples for documentation review. Parsed the XML search element and checked the example lock name is consistent. Shell syntax passed bash -n. Mermaid has six nodes and five edges. The social image was visually inspected and is readable without clipping.

## Limitations

No Db2 server or CLP was available; SQL was not parsed by Db2 or executed. No live locks, distributed members or recovery were tested. Some direct IBM 11.5 pages returned HTTP403; indexed official 11.5 documentation and accessible 11.1 interface pages supplied the reviewed details. Mermaid was checked structurally, not rendered.

## Sources

- https://www.ibm.com/docs/en/db2/11.5.x?topic=monitoring-locking-using-table-functions
- https://www.ibm.com/docs/en/db2/11.5.x?topic=clp-options
- https://www.ibm.com/docs/en/db2/11.1.0?topic=mpf-mon-get-appl-lockwait-table-function-get-information-about-locks-which-application-is-waiting
- https://www.ibm.com/docs/en/db2/11.5.x?topic=mmr-mon-get-locks-table-function-list-all-locks-in-currently-connected-database
- https://www.ibm.com/docs/en/db2/11.1.0?topic=mpf-mon-format-lock-name-format-internal-lock-name-return-details
- https://www.ibm.com/docs/en/db2/11.5.x?topic=reference-h
- https://www.ibm.com/docs/en/db2/11.5.x?topic=mv-mon-lockwaits-retrieve-metrics-applications-that-are-waiting-obtain-locks
- https://www.ibm.com/docs/en/db2/11.5.x?topic=functions-mon-get-connection-get-connection-metrics

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
