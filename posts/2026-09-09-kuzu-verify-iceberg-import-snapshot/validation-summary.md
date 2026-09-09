# Validation Summary: Verify Which Iceberg Snapshot a Kuzu Import Reads

## Status
validated

## Post Type
Technical troubleshooting guide with Cypher and Python examples.

## Technologies Covered
- Kuzu 0.11.3 and its Iceberg extension
- Apache Iceberg metadata, snapshots, manifests, and snapshot retention
- Embedded DuckDB and its Iceberg and httpfs extensions
- Cypher scanning and import commands
- Python pathlib, json, and hashlib

## Sources Consulted
- Kuzu extension installation and local server documentation: https://kuzudb.github.io/docs/extensions/
- Kuzu Iceberg reference, options, examples, and limitations: https://kuzudb.github.io/docs/extensions/attach/iceberg/
- Kuzu 0.11.3 Iceberg connector implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/iceberg/src/connector/iceberg_connector.cpp
- Kuzu 0.11.3 Iceberg integration tests: https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/iceberg/test/test_files/iceberg.test
- Kuzu 0.11.3 extension manager implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/src/extension/extension_manager.cpp
- Official downloadable example dataset: https://kuzudb.github.io/data/iceberg-extension/iceberg_tables.zip
- Apache Iceberg specification, including table metadata, snapshot references, sequence numbers, and file retention: https://iceberg.apache.org/spec/
- Python JSON documentation: https://docs.python.org/3/library/json.html
- Python pathlib documentation: https://docs.python.org/3/library/pathlib.html#pathlib.Path.read_bytes
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found
No technical issues found.

## Review Notes
- README.md required no changes. The guide explicitly targets the historical Kuzu 0.11.3 interface; current DuckDB capabilities are not used as evidence for that reader.
- Confirmed local-server INSTALL syntax and LOAD EXTENSION syntax against documentation and version-tagged tests. Iceberg is outside the four extensions preinstalled in the standard 0.11.3 distribution. The connector explicitly installs and loads DuckDB iceberg and httpfs.
- Confirmed string metadata-version selection, filename discovery, named function options using :=, scan options using =, and intentional path relocation. The version-tagged tests include both pinned metadata calls used in the post.
- Confirmed the distinction between retained snapshots and the current snapshot. Metadata versions and snapshot IDs serve different purposes; row counts alone cannot identify snapshot contents. The retention and external-source concurrency guidance is consistent with Iceberg metadata semantics.
- Downloaded the official dataset and verified that lineitem_iceberg contains metadata/v1.metadata.json and metadata/v2.metadata.json. Executed the post's Python snippet against the original v2 metadata bytes in a temporary directory, changing only the local input path. It returned snapshot ID 7635660646343998149 and metadata SHA-256 b6fa0c96477c7fa737d39d7aec65c8f5ec754d9dc6babf123b185ac4b6c1b37a, with the matching manifest-list path.
- The Python example prints a Python dictionary; it does not claim to emit a JSON document. Its snapshot ID string preserves integer precision for later serialization. The example assumes the populated tutorial table; empty tables can lack a current snapshot.
- Reviewed Cypher against official documentation and integration-test source; did not execute an end-to-end Kuzu installation, scan, or COPY. Compatible historical extension artifacts and the DuckDB extension dependencies remain environmental prerequisites. The local server URL is an explicitly stated prerequisite, not a public resource.
- Nested STRUCT scanning and Iceberg export limitations are documented. Actual delete handling and newer Iceberg features still require the artifact-specific verification recommended in the post.
