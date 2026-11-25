# Validation summary

Reviewed output formats, schema boundaries, replay identity and data exposure separately.

## Sources reviewed

- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://docs.python.org/3.11/library/csv.html
- https://docs.python.org/3.11/library/hashlib.html

## Checks performed

Executed pgBadger13.3 under Perl5.34.1 with JSON::XS4.02 and every article shell command on a four-statement synthetic fixture. Verified JSON grouped structure, raw14-column CSV, literal backslash-n output for a multiline query, and human-readable normalized text framing.

Executed the exact helpers under Python3.11.13. The CSV validator rejected wrong headers, short records and malformed quotes. An application name containing a quote reproduced invalid writer framing. JSON conversion produced three fingerprints, count4 and10ms total; repeated output was identical. Changing source identity changed the batch ID while preserving shape fingerprints. Negative counts, nonnumeric durations and infinity failed before output.

The CSV preserved the non-ASCII literal while a raw JSON sample contained altered encoding; the article reports this observed limitation. The adapter omits raw samples but does not claim anonymization.

The seven-node/seven-edge diagram passed structural checking. Generated and visually reviewed the1280x720 social image; two title lines fit.

## Limits

No data was sent to an external destination and no import/upsert was executed. The adapter is version-specific and assumes one closed source plus correctly paired report, with separate prevention of overlapping input windows. Quoting and sample-encoding limitations remain. Prepared protocols, all formats, unusual Unicode identifiers and every field value were not tested. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
