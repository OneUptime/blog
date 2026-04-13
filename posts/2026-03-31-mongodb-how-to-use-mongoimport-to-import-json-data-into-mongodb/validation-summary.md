# Validation Summary: How to Use mongoimport to Import JSON Data into MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongoimport (MongoDB Database Tools)
- JSON / NDJSON file formats
- Bash scripting
- mongosh (MongoDB Shell)

## Sources Consulted
- Official MongoDB Database Tools `mongoimport` documentation: https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB `mongo-tools` source code on GitHub (`mongoimport/options.go`): https://github.com/mongodb/mongo-tools
- MongoDB Database Tools installation documentation: https://www.mongodb.com/docs/database-tools/installation/

## Issues Found

1. **Incorrect `--stopOnError` default behavior claim (line 81)**: The comment stated "Stop on first error (default behavior - use --stopOnError)", implying that stopping on first error is the default. In reality, `mongoimport` **continues past errors by default** (including duplicate key and document validation errors). `--stopOnError` overrides this default. Fixed the comment to: "Stop on first error (by default mongoimport continues past errors)".

2. **Misleading Type Coercion section intro (lines 91-93)**: The section intro said "Sometimes JSON files have string values that should be stored as numbers or dates" and suggested using `--columnsHaveTypes`. However, `--columnsHaveTypes` is **only valid for CSV and TSV imports**, not JSON. For JSON imports, types are preserved from the JSON itself (numbers stay numbers, strings stay strings). Fixed the intro text to clarify this applies only to CSV/TSV and updated the code comment accordingly.

## Review Notes
- The `--batchSize` flag used in the "Importing Large Files in Batches" section is a hidden/undocumented option in mongoimport (defined with `hidden:"true"` in the source code, default value 1000). It works but does not appear in `--help` output or official documentation. Readers may be confused if they look for it in the docs. The file-splitting approach shown in the same section is the more conventional method for handling very large files.
- All import modes (`insert`, `upsert`, `merge`, `delete`) are correctly described.
- The bash script using `PIPESTATUS[0]` is correct for capturing the exit code of the first command in a pipe chain.
- The mongosh verification examples are syntactically correct and use appropriate methods (`countDocuments`, `findOne`, `typeof`).
