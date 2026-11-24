# Validation summary

Reviewed literal masking separately from identifiers, metadata, diagnostics and saved analysis data. The article explicitly reports limitations observed in the pinned release.

## Sources reviewed

- https://www.postgresql.org/docs/18/sql-syntax-lexical.html
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://docs.python.org/3.11/library/html.parser.html
- https://docs.python.org/3.11/library/html.html

## Checks performed

Executed pgBadger13.3 under Perl5.34.1 using synthetic standard-error records with identifiable markers. Confirmed markers in ordinary HTML, then compared output with --anonymize --nocomment. Ordinary string, numeric literal, block-comment and statement-string markers were absent. Dollar-quoted value, line comment, table identifier, user/database/application/client values, constraint name and error detail remained. Binary output retained the original ordinary-string marker despite anonymization.

Executed the exact HTML checker under Python3.11.13. It detected the surviving marker and an entity-encoded marker split across formatting tags; rejected an empty pattern list; and returned no match for the masked marker. Output included only pattern numbers, not matched contents. All exposure assertions and shell syntax checks passed.

The six-node/five-edge Mermaid diagram passed structural checks. Generated and visually inspected the1280x720 social image; its two title lines fit.

## Limits

No real personal data, secrets or production reports were used or shared. Tests do not constitute exhaustive SQL parsing or a general data-loss-prevention scanner. Prepared protocol details, JSON/CSV output, linked assets and every encoding or literal syntax were not tested. HTML was inspected through decoded source/text without browser visual review. Mermaid was not browser-rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
