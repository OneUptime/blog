# Validation Summary: How to Export and Validate a Kuzu Graph Before Moving to Another Database

## Status

validated

## Post Type

Technical migration and validation guide

## Technologies Covered

- Kuzu 0.11.3
- LadybugDB
- Cypher
- Apache Parquet and CSV
- GNU Coreutils and Findutils
- Graph database migration and validation

## Sources Consulted

- [Kuzu migration documentation](https://kuzudb.github.io/docs/migrate/)
- [Kuzu export overview](https://kuzudb.github.io/docs/export/)
- [Kuzu Parquet export documentation](https://kuzudb.github.io/docs/export/parquet/)
- [Kuzu CLI and output modes](https://kuzudb.github.io/docs/client-apis/cli/)
- [Kuzu catalog `CALL` functions](https://kuzudb.github.io/docs/cypher/query-clauses/call/)
- [Kuzu extension documentation](https://kuzudb.github.io/docs/extensions/)
- [Kuzu transaction and checkpoint documentation](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu Cypher syntax and reserved keywords](https://kuzudb.github.io/docs/cypher/syntax/)
- [Kuzu create-table documentation](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu v0.11.3 source: export implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/operator/simple/export_db.cpp)
- [Kuzu v0.11.3 source: export path handling](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/map/map_simple.cpp)
- [Kuzu archived repository](https://github.com/kuzudb/kuzu)
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Ladybug migration documentation](https://docs.ladybugdb.com/migrate/)
- [Ladybug repository](https://github.com/LadybugDB/ladybug)
- [GNU `sha256sum` documentation](https://www.gnu.org/software/coreutils/sha256sum)
- [GNU `sort` documentation](https://www.gnu.org/software/coreutils/sort)
- [GNU Findutils safe file-name handling](https://www.gnu.org/software/findutils/manual/find.html#Safe-File-Name-Handling)

## Issues Found

1. The post described `macro.cypher` as a Kuzu 0.11.3 export file and omitted `index.cypher`. The final release actually writes macro definitions into `schema.cypher` and indexes into `index.cypher`. Corrected the introduction, bundle tree, and inspection instructions to match the released implementation.
2. The range-invariant query used the reserved keyword `Order` as an unescaped node-table name, which causes a parser error. Changed it to the escaped label `` `Order` ``.
3. The post advised using a new empty export directory, but Kuzu rejects every existing destination directory, including an empty one. Changed the instruction to use a path that does not yet exist and noted that Kuzu creates it.
4. The pre-export inventory omitted indexes even though index extension state determines whether indexes are exported, and loaded extensions are session-scoped. Added `SHOW_INDEXES()` and clarified that the inventory and extension loading must occur in the session used for export.
5. The uniqueness-query comment claimed it established that every source primary key was preserved, but the query only detects duplicate values among rows that exist. Reworded the comment to describe the check accurately.
6. The deterministic relationship sample did not completely order all returned values when parallel edges shared the same user, product, and timestamp. Added `r.quantity` to `ORDER BY`.
7. The checksum manifest stored absolute paths, so it would fail after the bundle moved to a different location. Changed generation and checking to run inside the export directory and record relative paths.

## Review Notes

- All Cypher examples, catalog calls, `CHECKPOINT`, Parquet and CSV `EXPORT DATABASE`, and `IMPORT DATABASE` were executed successfully with the released `kuzu==0.11.3` package after the corrections.
- A live Kuzu 0.11.3 export confirmed the actual `schema.cypher`, `copy.cypher`, and `index.cypher` layout. A clean import restored it successfully.
- Kuzu 0.11.3 is the final release and its repository is archived. LadybugDB is actively maintained and identifies itself as formerly Kuzu; a Kuzu 0.11.3 logical export was also test-imported successfully into Ladybug 0.19.1. Raw database-file renaming is not a migration.
- The revised checksum commands were tested both in place and after relocating the bundle. They use GNU utilities; stock macOS uses different checksum tooling unless GNU Coreutils is installed.
- Every external link in the post resolved to the intended official documentation or repository during review.
