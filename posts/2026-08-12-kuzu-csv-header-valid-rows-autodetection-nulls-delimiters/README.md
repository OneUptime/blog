# Fix Kuzu CSV Headers, Nulls, Delimiters, and Rejected Rows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, CSV Import, Data Quality, COPY FROM, Troubleshooting

Description: Make Kuzu CSV imports deterministic by pinning header, delimiter, quote, escape, and null rules, then auditing every ignored row.

---

Kuzu auto-detects several CSV settings when `COPY FROM` or `LOAD FROM` does not specify them. That convenience can misclassify a header as data, treat the first data row as a header, choose the wrong delimiter, or interpret a source null marker as an ordinary string. The fix is to inspect the bytes, declare the dialect explicitly, and treat ignored rows as a measured data-quality decision.

The behavior below is pinned to Kuzu 0.11.3, the final archived release. Older versions may differ.

For repeatable ingestion, do not let production infer a format you already know.

## Why Header Detection Can Be Wrong

For `COPY FROM`, Kuzu's documented header detector parses the first line and compares each value with the corresponding target column type. `LOAD FROM` has no target schema, so it compares the first row's inferred types with types inferred from the sampled rows. In final Kuzu 0.11.3, a first-row value inferred as `STRING` where a non-string type is expected can make the detector treat the line as a header; otherwise it treats the line as data.

That heuristic has two obvious ambiguous cases.

First, a header for an all-string table is valid string data:

~~~cypher
CREATE NODE TABLE Customer(
    customer_id STRING PRIMARY KEY,
    name STRING,
    region STRING
);
~~~

~~~csv
customer_id,name,region
c-1,Ada,eu-west
c-2,Grace,us-east
~~~

Every header token can be cast to `STRING`, so inference may insert a node whose primary key is `customer_id`. Declare the header:

~~~cypher
COPY Customer FROM 'customers.csv'
  (HEADER=true, DELIM=',');
~~~

Second, a headerless file's first real row may not match the target schema. Kuzu can then treat that row as a header and skip it. A date in an unexpected format, or another value inferred as `STRING` where the target expects a non-string type, can trigger the misclassification.

For a headerless file, say so:

~~~cypher
COPY Customer FROM 'customers-no-header.csv'
  (HEADER=false, DELIM=',');
~~~

Explicit `HEADER` removes the guess but does not fix incompatible values. Validate the target types and source representation separately.

## Disable Auto-Detection Completely for a Fixed Contract

Kuzu auto-detects unspecified `HEADER`, `DELIM`, `QUOTE`, and `ESCAPE` settings by default. Specifying only two leaves the other two inferred:

~~~cypher
COPY Customer FROM 'customers.psv' (
    FILE_FORMAT='csv',
    HEADER=true,
    DELIM='|'
);
~~~

Kuzu still detects quote and escape behavior. If the producer has a contract, pin the whole dialect:

~~~cypher
COPY Customer FROM 'customers.psv' (
    FILE_FORMAT='csv',
    HEADER=true,
    DELIM='|',
    QUOTE='"',
    ESCAPE='\\',
    AUTO_DETECT=false
);
~~~

With auto-detection off, unspecified fields use the final Kuzu 0.11.3 implementation defaults: `HEADER=false`, `DELIM=','`, `QUOTE='"'`, `ESCAPE='"'`, `SKIP=0`, and `IGNORE_ERRORS=false`. State every meaningful choice anyway so a reviewer does not need to reconstruct defaults.

Kuzu's detector samples the first 256 lines by default and considers delimiters comma, pipe, semicolon, and tab; quote candidates double quote, single quote, or none; and several escape candidates. `sample_size` changes how much it examines, but a larger sample does not resolve a genuinely ambiguous file. An explicit contract does.

## Inspect the File Before Running `COPY`

Use read-only checks on the exact file mounted into the Kuzu process:

~~~bash
file --brief --mime customers.psv
sed -n '1,5p' customers.psv
python - <<'PY'
import csv

with open('customers.psv', newline='', encoding='utf-8') as stream:
    reader = csv.reader(
        stream,
        delimiter='|',
        quotechar='"',
        escapechar='\\',
        doublequote=False,
        strict=True,
    )
    for number, row in zip(range(1, 6), reader):
        print(number, len(row), row)
PY
~~~

Treat this Python parser as a structural preview, not an exact Kuzu validator: Python applies `escapechar` to any following character, whereas Kuzu 0.11.3 recognizes `ESCAPE` only before `QUOTE` or `ESCAPE` inside quoted fields. Inspect null sentinels such as `\N` in the raw file, and use the staging `COPY` as authoritative.

Run this inside the same container or environment so the path and bytes match production. Check:

- whether a header actually exists;
- line endings and encoding;
- delimiter inside quoted fields;
- quote and escape convention;
- consistent column count;
- whitespace around numeric/date values;
- source spellings for null;
- duplicate or missing primary keys;
- relationship endpoint column order.

Do not “fix” a producer contract by editing a one-off production file manually. Normalize it in a repeatable staging step or correct the producer.

## Preview with `LOAD FROM`

`LOAD FROM` scans external data without first copying it into a node or relationship table. Use the same options planned for import and inspect a bounded sample:

~~~cypher
LOAD FROM 'customers.psv' (
    FILE_FORMAT='csv',
    HEADER=true,
    DELIM='|',
    QUOTE='"',
    ESCAPE='\\',
    AUTO_DETECT=false
)
RETURN *
LIMIT 20;
~~~

Confirm column names, inferred types, nulls, and values. A preview is not full validation: malformed data may appear later, and a target table applies its own casts and primary-key constraints. Run a staging import against the complete file.

## Define Null Semantics Explicitly

Kuzu's default `NULL_STRINGS` list contains only the empty string. For `STRING` columns, that means an empty value becomes `NULL` while nonempty markers such as `NULL`, `null`, `N/A`, or `\N` remain ordinary strings unless configured. Final Kuzu 0.11.3 handles non-string targets differently: empty or whitespace-only values and case-insensitive `NULL` become null, while custom markers such as `N/A` or `\N` fail to cast.

For `STRING` columns, set `NULL_STRINGS` to the source contract:

~~~cypher
COPY Customer FROM 'customers.psv' (
    FILE_FORMAT='csv',
    HEADER=true,
    DELIM='|',
    QUOTE='"',
    ESCAPE='\\',
    AUTO_DETECT=false,
    NULL_STRINGS=['', 'NULL', '\\N']
);
~~~

`NULL_STRINGS` matching for `STRING` values is exact, so case and whitespace matter. For non-string targets, final Kuzu 0.11.3 does not use custom `NULL_STRINGS`; normalize custom sentinels before `COPY`. Do not list `N/A` as null if it is a legitimate business value. If an empty string must remain distinct from null in a `STRING` column, test a configuration that uses a dedicated null sentinel and verify the round trip; never assume the target preserves a distinction the import rule has erased.

After import, compare null counts to the source expectation:

~~~cypher
MATCH (c:Customer)
RETURN count(*) AS customers,
       count(c.region) AS customers_with_region;
~~~

The difference is the number with null `region`. Check important properties individually.

## Whitespace Is Data

Whitespace handling is type-dependent. Final Kuzu 0.11.3 preserves leading and trailing spaces in `STRING` fields, while common typed casts such as integers, booleans, and dates trim surrounding whitespace; for example, ` 213 ` is accepted as integer `213`. Validate the exact target types because other types can differ.

If the producer contract requires normalized whitespace, normalize upstream with a parser that understands quotes. Do not run a global whitespace replacement: spaces inside names and quoted text can be meaningful. Retain the original file and transform version for audit.

## Treat `IGNORE_ERRORS` as Quarantine, Not Success

The default `IGNORE_ERRORS=false` makes malformed input fail rather than disappear. Keep that default for strict loads. If a business-approved pipeline may quarantine bad records, enable it intentionally:

~~~cypher
COPY Customer FROM 'customers.psv' (
    FILE_FORMAT='csv',
    HEADER=true,
    DELIM='|',
    QUOTE='"',
    ESCAPE='\\',
    AUTO_DETECT=false,
    IGNORE_ERRORS=true
);

CALL SHOW_WARNINGS() RETURN *;
~~~

Kuzu documents that ignored malformed rows are exposed through warnings, with `CLEAR_WARNINGS()` available to clear them. The warnings table is connection-level and accumulates for the connection's lifetime, so use a fresh connection, preserve and clear earlier warnings before the import, or filter on the current `query_id` when computing a per-import count. Export the details and compare the count with an explicit threshold.

Use a fresh connection for an exact count from the `COPY` result. In final Kuzu 0.11.3, that result reports all warnings counted since the previous completed `COPY`, not necessarily only that import: `CLEAR_WARNINGS()` clears retained warning rows but not the internal counter, so warnings from an earlier `LOAD FROM` can inflate the result. Warning details are retained only up to the connection's `warning_limit`, which defaults to 8192. Additional details are discarded after that limit, so configure it high enough before the import if every rejected row must be retained.

A pipeline that reports “COPY succeeded” while silently dropping 5% of customers has failed. Record attempted, inserted, rejected, and duplicate counts. Repair and replay quarantined rows after fixing the source.

## Relationship CSVs Have a Special Column Contract

When copying into a relationship table, Kuzu expects the first two columns to contain the primary keys of the `FROM` and `TO` nodes. Remaining columns map to relationship properties.

~~~cypher
CREATE NODE TABLE User(id STRING PRIMARY KEY, name STRING);
CREATE REL TABLE FOLLOWS(FROM User TO User, since DATE);
~~~

~~~csv
from_user_id,to_user_id,since
u-1,u-2,2025-01-02
u-2,u-3,2025-03-04
~~~

~~~cypher
COPY FOLLOWS FROM 'follows.csv' (
    HEADER=true,
    DELIM=',',
    AUTO_DETECT=false
);
~~~

Load the `User` nodes first. A perfectly parsed relationship CSV still fails if an endpoint key does not exist. Swapping the first two columns may import a valid but semantically reversed graph, so validate direction with known examples.

## Use a Staging Gate

Before importing a full production graph:

1. preserve and checksum the source file;
2. record its producer version and expected dialect;
3. inspect representative rows and edge cases;
4. preview with `LOAD FROM` using explicit options;
5. copy into an empty disposable Kuzu database;
6. inspect warnings and reconcile row counts;
7. validate primary keys, null distributions, ranges, and relationship direction;
8. rerun the same job against a fresh empty database to prove inputs and configuration are reproducible;
9. promote the exact file and import configuration together.

For multiple files or glob patterns, require the same column layout and dialect in every file. A valid first shard does not validate later shards.

## Official Documentation

- [Kuzu import overview and explicit file formats](https://kuzudb.github.io/docs/import/)
- [Kuzu CSV import and all configuration options](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu `LOAD FROM` scanning](https://kuzudb.github.io/docs/get-started/scan/)
- [Kuzu warnings table and `SHOW_WARNINGS`](https://kuzudb.github.io/docs/import/#warnings-table-inspecting-skipped-rows)
- [Kuzu create-table types and primary keys](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu data types](https://kuzudb.github.io/docs/cypher/data-types/)
- [Kuzu transactions and `COPY FROM`](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu configuration and warning limit](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu final v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu final archived source repository](https://github.com/kuzudb/kuzu)

## Conclusion

CSV auto-detection is useful for exploration, but a production import should declare its format. Pin header, delimiter, quote, escape, auto-detection, and null rules; preview the file; and make rejected rows observable. Deterministic parsing plus graph-level invariants is what separates a successful `COPY` statement from a correct import.
