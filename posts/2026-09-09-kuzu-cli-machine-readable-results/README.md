# Save Kuzu CLI Results as Machine-Readable Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Cypher, CLI, Data Export, JSON

Description: Export clean JSON, NDJSON, and CSV from Kuzu CLI queries and use COPY TO when a dedicated data file is the safer interface.

The default Kuzu CLI output is designed for reading in a terminal. A file containing table borders, timing statistics, and status messages is a poor interface for another program. Select a machine-readable output mode before running the query, then parse the resulting file as a verification step.

This guide targets the official 0.11.3 CLI. It distinguishes shell-rendered query results from `COPY TO`, which writes a data file directly through the database engine.

## Export exactly one query as JSON

Assume an existing database contains `Person(id INT64, name STRING)`. Save this single statement in `people.cypher`:

```cypher
MATCH (person:Person)
RETURN person.id AS id, person.name AS name
ORDER BY id;
```

Run it from a directory without a `.kuzurc` startup file:

```bash
kuzu /absolute/path/example.kuzu -r -d 256 -m json -s -b \
  < people.cypher > people.json 2> people.errors
python -m json.tool people.json > /dev/null
```

Replace the database path with your actual path. `-r` opens it read-only, `-m json` selects a JSON array, `-s` suppresses statistics and the normal opening banner, and `-b` disables progress output. The [CLI reference](https://kuzudb.github.io/docs/client-apis/cli/) lists output modes.

The exported data might look like this:

```json
[
  {"id": 1, "name": "Ada"},
  {"id": 2, "name": "Ben"}
]
```

Use scalar aliases such as `id` and `name` so consumers do not depend on expression-generated column names. Export only the fields the interface requires. Returning an entire node includes graph-specific structure that may not be the stable record shape your downstream program expects.

## Avoid startup and multi-query contamination

The CLI processes `.kuzurc` in its working directory when present. An explicit `-i` startup file is another source of output. In 0.11.3, even `-i /dev/null` prints a processing line, so it is not a clean-output workaround.

For an automated export, use a controlled working directory with no startup file, absolute database and input paths, and no extra statements in the export script. The [startup source](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/shell_runner.cpp) shows this behavior.

Two queries in JSON mode produce two result arrays, not one merged JSON document. DDL statements can produce their own result objects. A JSON parser should reject this concatenated output instead of the consumer silently reading only the first array.

Error handling also needs care. A query error can be reported without a failing process exit status. Inspect the error log and parse the output. Parsing alone is insufficient if a script executes another successful query after a failed query, which is another reason to export exactly one statement.

## Use NDJSON for record-oriented processing

JSON Lines emits one JSON object per line:

```bash
kuzu /absolute/path/example.kuzu -r -d 256 -m jsonlines -s -b \
  < people.cypher > people.ndjson 2> people.errors
```

Validate every record:

```python
import json

count = 0
with open("people.ndjson", encoding="utf-8") as stream:
    for line in stream:
        if line.strip():
            record = json.loads(line)
            assert set(record) == {"id", "name"}
            count += 1
print(f"Read {count} people")
```

NDJSON is convenient for streaming consumers because they can process a record without reading a closing array delimiter. It does not automatically make the underlying Kuzu query stream with constant memory, and it does not supply a schema beyond the fields you export.

For CSV, switch to `-m csv` and use a real CSV parser. Names containing commas, quotes, or newlines make splitting text on commas incorrect. Decide how nulls, empty strings, and nested values should be represented before declaring a CSV export suitable for round trips.

## Prefer COPY TO for a dedicated export artifact

For a durable data exchange file, the engine's export command separates the data artifact from shell messages:

```cypher
COPY (
    MATCH (person:Person)
    RETURN person.id AS id, person.name AS name
    ORDER BY id
) TO '/absolute/path/people.csv' (HEADER=true);
```

Run that statement through the CLI and retain its status output separately. The file contains query data; banners and timing information stay in the shell output. Use a new destination path and verify the resulting file rather than assuming an existing file was replaced as intended.

Kuzu also supports documented JSON and Parquet export paths. JSON export requires the JSON extension to be loaded; it is bundled with 0.11.3. Parquet is often a better choice when downstream code needs to preserve typed columns. Choose a format based on the consumer's requirements, not the terminal display you prefer.

## Validate contents and publish atomically

Test quotes, Unicode, embedded newlines, nulls, empty results, and a row count greater than the default terminal display limit. The CLI's display limits apply to particular human-oriented modes, so avoid trying to obtain a complete export by copying a boxed table.

Write to a temporary filename, parse it, check expected columns and counts, and only then rename it to the final path consumed by other jobs. A successful rename can make a complete artifact visible at once on a single filesystem. Keep the error log if validation fails and leave the previous valid export available.

## Conclusion

Select the output format before querying, suppress shell noise, and export one result set per file. Use `COPY TO` when the data artifact should be independent of CLI rendering, and validate both file syntax and expected contents before publication.

## Official Documentation

- [CLI output modes](https://kuzudb.github.io/docs/client-apis/cli/)
- [CLI startup handling](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/shell_runner.cpp)
- [Export data](https://kuzudb.github.io/docs/export/)
- [Copy to CSV](https://kuzudb.github.io/docs/export/csv/)
