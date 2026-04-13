# Validation Summary: How to Use $out to Write Results to S3 from MongoDB Atlas Data Federation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Data Federation (Federated Database Instance)
- MongoDB `$out` aggregation stage (Atlas Data Federation extension)
- Amazon S3
- PyMongo (Python driver)
- mongosh

## Sources Consulted
- [$out Stage — Atlas Data Federation (MongoDB Docs)](https://www.mongodb.com/docs/atlas/data-federation/supported-unsupported/pipeline/out/) — authoritative reference for `$out` syntax, supported fields, and format options in Federated Database Instances
- [Define Path for S3 Data (MongoDB Docs)](https://www.mongodb.com/docs/atlas/data-federation/config/path-syntax-examples/) — path syntax for storage configuration (confirmed that `{yyyy}` template variables belong here, not in `$out` filename)
- [Deploy a Federated Database Instance in AWS S3 (MongoDB Docs)](https://www.mongodb.com/docs/atlas/data-federation/deployment/deploy-s3/) — IAM permissions and setup requirements

## Issues Found

1. **Incorrect date template placeholders in `$out` filename field (critical)**
   - **What was wrong:** The post used `{yyyy}`, `{mm}`, `{dd}`, `{hh}` placeholders in the `$out` `filename` field (e.g., `"reports/{yyyy}/{mm}/{dd}/summary"`) and claimed these are "substituted with the current UTC date/time at query execution." This syntax does not exist in the `$out` stage. It was confused with the storage configuration path syntax used for reading/partitioning data, which uses a different format entirely (`{year int:\d{4}}`).
   - **What was changed:** Replaced all `{yyyy}/{mm}/{dd}` filename patterns with correct approaches: static paths where appropriate, JavaScript `Date` construction for mongosh examples, and an aggregation expression example (`$concat`/`$toString`) for document-field-based partitioning. Renamed the section from "Dynamic Path Templates" to "Dynamic Path Construction" to reflect the programmatic approach.
   - **Why:** The `$out` `filename` field accepts either a string literal or an aggregation expression referencing document fields — not template placeholders.

2. **Incomplete list of supported output formats**
   - **What was wrong:** The "Supported Output Formats" section listed only 4 formats (json, csv, bson, parquet) and described JSON as "Newline-delimited JSON." Atlas Data Federation actually supports 9 format values including compressed variants (json.gz, csv.gz, tsv.gz, bson.gz) and TSV. The JSON format writes MongoDB Extended JSON, not plain JSON.
   - **What was changed:** Expanded the format list to include all 9 supported format values and corrected the JSON description to "MongoDB Extended JSON."
   - **Why:** The section title "Supported Output Formats" implies completeness, and omitting TSV and compressed variants was misleading. The Extended JSON distinction matters for downstream consumers that need to handle BSON-specific types.

3. **Post description was too narrow**
   - **What was wrong:** The metadata description said "JSON or CSV format" but the post covers JSON, CSV, BSON, and Parquet.
   - **What was changed:** Updated to "formats like JSON, CSV, and Parquet."
   - **Why:** Accuracy in the description/metadata.

4. **Summary referenced non-existent feature**
   - **What was wrong:** The summary mentioned "date-based path templates for automatic Hive-style partitioning," which referenced the incorrect template variable feature.
   - **What was changed:** Updated to describe the correct approach: constructing paths programmatically or using aggregation expressions.
   - **Why:** Consistency with the corrected content in the body.

## Review Notes
- The `$out` syntax (bucket, region, filename, format with maxFileSize) is correct per official docs. The `region` field is optional — if omitted, the FDI storage configuration determines the region.
- The `maxFileSize` values use "MB" (e.g., "100MB"). The docs show "MiB" examples but state that both Base 10 and Base 2 suffixes are supported, so "MB" is acceptable.
- The Python example correctly constructs the date path using f-strings before passing it to the aggregation pipeline, which was already the correct approach even in the original post.
- The `$out` stage also supports an `errorMode` field ("stop" or "continue") and Parquet-specific options (`maxRowGroupSize`, `columnCompression`) that the post doesn't mention. These are optional and their omission is fine for a tutorial-level post.
- `datetime.utcnow()` in the Python example is deprecated since Python 3.12 in favor of `datetime.now(datetime.UTC)`, but it still works and is widely used. Not changed since it's functional and the post doesn't target a specific Python version.
