# Validation Summary: Fix Kuzu CSV Headers, Nulls, Delimiters, and Rejected Rows

## Status

validated

## Post Type

Troubleshooting guide / data-import guide

## Technologies Covered

- Kuzu 0.11.3
- Cypher `COPY FROM` and `LOAD FROM`
- CSV dialect detection and parsing
- Kuzu warnings and connection configuration
- Python's `csv` module
- Shell file-inspection commands

## Sources Consulted

- [Kuzu CSV import documentation](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu import and warnings documentation](https://kuzudb.github.io/docs/import/)
- [Kuzu `LOAD FROM` scanning documentation](https://kuzudb.github.io/docs/get-started/scan/)
- [Kuzu create-table documentation](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu data-types documentation](https://kuzudb.github.io/docs/cypher/data-types/)
- [Kuzu transaction documentation](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu connection-configuration documentation](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu v0.11.3 CSV constants and implementation defaults](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/common/constants.h#L108-L134)
- [Kuzu v0.11.3 header/type detector](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/operator/persistent/reader/csv/driver.cpp#L173-L306)
- [Kuzu v0.11.3 dialect-option generator](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/operator/persistent/reader/csv/dialect_detection.cpp#L6-L42)
- [Kuzu v0.11.3 CSV parser state machine](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/operator/persistent/reader/csv/base_csv_reader.cpp#L388-L480)
- [Kuzu v0.11.3 null-string handling](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/cast_from_string_functions.cpp#L245-L263)
- [Kuzu v0.11.3 type-dependent null dispatch](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/cast_from_string_functions.cpp#L850-L869)
- [Kuzu v0.11.3 warning storage and counting](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/warning_context.cpp#L24-L78)
- [Python `csv` dialect documentation](https://docs.python.org/3/library/csv.html#dialects-and-formatting-parameters)

## Issues Found

1. **The Python preview did not exactly model Kuzu's escape rules.** Python's `csv.reader` removes the special meaning of the character following `escapechar`, including in unquoted fields, while Kuzu 0.11.3 processes `ESCAPE` only inside quoted fields and permits it only before `QUOTE` or `ESCAPE`. This can make an unquoted `\N` appear as `N` in the Python output even though Kuzu preserves it for `NULL_STRINGS` matching. Added a warning to inspect null sentinels in the raw file and treat the staging `COPY` as authoritative.
2. **The `COPY` result's warning count was described as if it were always scoped to that import.** In Kuzu 0.11.3, the internal count is consumed and reset by a completed `COPY`, but `CLEAR_WARNINGS()` clears only retained warning rows. Warnings from an earlier ignored `LOAD FROM` can therefore inflate the next `COPY` result. Corrected the post to require a fresh connection for an exact per-import result count while retaining the accurate `warning_limit=8192` guidance.

## Review Notes

- The post is intentionally version-pinned because Kuzu 0.11.3 was the final release and the repository was archived on October 10, 2025.
- The archived CSV documentation conflicts with the released 0.11.3 implementation in two places: it lists backslash as the default `ESCAPE` and says a padded integer such as ` 213 ` is malformed. The v0.11.3 tagged source and official Python wheel show that the implementation default is `ESCAPE='"'` and that integer, Boolean, and date casts accept surrounding whitespace. The post correctly describes the released implementation and labels these as implementation-specific behaviors.
- Executed the Kuzu snippets against the official `kuzu==0.11.3` Python wheel in temporary databases. This confirmed the all-`STRING` header ambiguity, headerless first-row misclassification, explicit `.psv` format and dialect options, exact `STRING` null matching, non-`STRING` null behavior, whitespace handling, warning behavior, aggregate null counts, and relationship import direction.
- All referenced documentation links were reachable during validation.
