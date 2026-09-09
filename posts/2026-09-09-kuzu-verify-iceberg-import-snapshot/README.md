# Verify Which Iceberg Snapshot a Kuzu Import Reads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Apache Iceberg, Data Import, Database, Troubleshooting

Description: Distinguish Iceberg metadata versions from snapshot IDs, pin Kuzu scan options, and verify imported rows against a stable source snapshot.

An Iceberg table can retain several snapshots inside one metadata file. Therefore, seeing a snapshot in `ICEBERG_SNAPSHOTS` does not prove that an import read it, and setting Kuzu's `version` option does not mean passing an Iceberg snapshot ID.

The verification process needs three pieces of evidence: the metadata file selected, the snapshot expected from that metadata, and the data actually scanned and imported. This guide targets Kuzu 0.11.3 and its archived Iceberg extension interface.

## Check the complete extension environment

Iceberg is not bundled with Kuzu 0.11.3. Provision a matching extension through a controlled local extension server:

```cypher
INSTALL iceberg FROM 'http://localhost:8080/';
LOAD EXTENSION iceberg;
```

This assumes the server already contains compatible release and platform artifacts. The [0.11.3 Iceberg connector source](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/iceberg/src/connector/iceberg_connector.cpp) also creates an embedded DuckDB connection and installs/loads DuckDB's `iceberg` and `httpfs` extensions. Account for those dependencies and their artifact availability when reproducing a historical environment.

Do not infer Kuzu support from the current DuckDB Iceberg documentation alone. Kuzu wraps a particular integration, and its exposed options and behavior must be checked against the installed artifacts.

## Distinguish identifiers

| Value | Meaning |
| --- | --- |
| Metadata version such as `2` | Selects a metadata filename according to Kuzu's filename rules |
| Metadata `current-snapshot-id` | Identifies the table's current snapshot in that metadata document |
| Snapshot ID | Identifies one retained Iceberg snapshot |
| Snapshot sequence number | Orders snapshot-related changes according to Iceberg semantics |

The [Kuzu Iceberg reference](https://kuzudb.github.io/docs/extensions/attach/iceberg/) documents `version` as a string metadata version, with the default determined from a version-hint file. That hint is a metadata-discovery input, not a timestamp or a snapshot selector.

A catalog-managed table may use metadata naming and discovery conventions different from the simple directory example. Resolve the authoritative metadata location through the source catalog and confirm that Kuzu's path-based scan supports it. Do not simply pick the filename that sorts last.

## Inspect a pinned metadata version

The official example dataset contains a `lineitem_iceberg` table with metadata versions one and two. After obtaining that dataset from the linked documentation, inspect the second version:

```cypher
CALL ICEBERG_SNAPSHOTS(
    '/tmp/iceberg_tables/lineitem_iceberg', version := '2'
) RETURN *;
CALL ICEBERG_METADATA(
    '/tmp/iceberg_tables/lineitem_iceberg',
    version := '2', allow_moved_paths := true
) RETURN *;
```

Named function options use `:=`. File-scan options use `=`. `allow_moved_paths` is appropriate for the relocated tutorial dataset; enable it for your own table only when path relocation is intentional.

Read the metadata JSON too:

```python
from pathlib import Path
import hashlib
import json

path = Path('/tmp/iceberg_tables/lineitem_iceberg/metadata/v2.metadata.json')
raw = path.read_bytes()
metadata = json.loads(raw)
expected_id = metadata['current-snapshot-id']
snapshot = next(item for item in metadata['snapshots']
                if item['snapshot-id'] == expected_id)
print({
    'metadata_file': str(path),
    'metadata_sha256': hashlib.sha256(raw).hexdigest(),
    'expected_snapshot_id': str(expected_id),
    'manifest_list': snapshot['manifest-list'],
})
```

This records the expected snapshot and the exact metadata bytes. Preserve large snapshot IDs as strings when handing the record to systems whose JSON number handling loses 64-bit integer precision.

The snapshot listing is a history view. Do not select a snapshot merely because its timestamp is the largest: branches, rollbacks, and retained history can make that an incorrect interpretation of the current table state.

## Scan with the same pinned options

```cypher
LOAD FROM '/tmp/iceberg_tables/lineitem_iceberg' (
    file_format='iceberg',
    version='2',
    allow_moved_paths=true
)
RETURN count(*) AS rows;
```

Compare this result with a read of `expected_snapshot_id` through the table's authoritative Iceberg engine. Use more than a row count: compare stable keys, selected values that differ between snapshots, and deleted-row behavior. Two snapshots can contain the same number of rows with different contents.

A controlled two-snapshot fixture is especially useful. Put one identifiable row only in the older snapshot and another only in the newer snapshot. Confirm which row Kuzu returns with each pinned metadata version. That validates actual scan behavior in your artifact combination rather than relying solely on metadata inspection.

Do not pass a snapshot ID to `version='...'` and assume time travel. This guide uses only the documented metadata-version option; any additional snapshot-selection capability must be independently verified for the installed extension.

## Make the import reproducible

Use the same path and options in the final `COPY`, and create a target schema matching an explicit projected column set. Keep the source metadata and referenced data files available for the duration of the scan and import. Snapshot expiration or object deletion can invalidate a previously inspected metadata document.

For a changing source, freeze a source export or use a stable metadata reference supported by the reader. A Kuzu transaction cannot prevent the external Iceberg catalog from advancing. After import, compare target keys and values with the verified scan and record the target database version and import batch ID.

The Kuzu documentation also records limitations, including nested `STRUCT` scanning and Iceberg export. Test delete semantics and newer Iceberg features present in your actual source rather than assuming this archived reader supports every current table feature.

## Conclusion

Pin metadata discovery, inspect the expected snapshot, and verify the scanned rows against an authoritative snapshot read. Record the metadata hash and import options so a later audit can establish what the graph actually imported.

## Official Documentation

- [Kuzu Iceberg extension](https://kuzudb.github.io/docs/extensions/attach/iceberg/)
- [Iceberg specification](https://iceberg.apache.org/spec/)
- [Kuzu Iceberg connector source](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/iceberg/src/connector/iceberg_connector.cpp)
- [Official Iceberg metadata tests](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/iceberg/test/test_files/iceberg.test)
