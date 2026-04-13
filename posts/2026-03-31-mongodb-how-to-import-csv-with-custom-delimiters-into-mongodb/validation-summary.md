# Validation Summary: How to Import CSV with Custom Delimiters into MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongoimport (MongoDB Database Tools)
- Python csv module
- pymongo
- pandas

## Sources Consulted
- [mongoimport - MongoDB Database Tools Documentation](https://www.mongodb.com/docs/database-tools/mongoimport/)
- [mongoimport Examples - MongoDB Database Tools Documentation](https://www.mongodb.com/docs/database-tools/mongoimport/mongoimport-examples/)
- [JIRA TOOLS-1544: allow mongoimport to specify different delimiter for CSV file](https://jira.mongodb.org/browse/TOOLS-1544) — confirms `--fieldSeparator` does not exist
- [MongoDB Feedback Engine: Mongoimport should support delimiter option](https://feedback.mongodb.com/forums/924355-ops-tools/suggestions/43342350-mongoimport-should-support-delimiter-option-when-i) — confirms custom delimiters are not supported
- [MongoDB Community Forum: mongoimport columnsHaveTypes and ObjectID](https://www.mongodb.com/community/forums/t/mongoimport-using-csv-and-columnshavetypes-how-to-specify-an-objectid/192929) — confirms `objectid()` is not a supported type

## Issues Found

### 1. Non-existent `--fieldSeparator` flag (Critical)
**What was wrong:** The post claimed `mongoimport` supports a `--fieldSeparator` flag for specifying custom delimiters like pipe (`|`). This flag does not exist. `mongoimport` only natively supports comma-separated (CSV) and tab-separated (TSV) formats. Open JIRA tickets (TOOLS-1544) and MongoDB feedback requests confirm this feature has been requested but never implemented.

**What was changed:** Rewrote the pipe-delimited section to use `sed` preprocessing to convert pipe-delimited files to CSV before importing. Removed `--fieldSeparator ","` from the upsert example. Updated the introduction and summary to accurately state that only comma and tab delimiters are natively supported.

### 2. Incorrect `objectid()` in supported types list
**What was wrong:** The post listed `objectid()` as a supported type for `--columnsHaveTypes`. This type is not supported — the MongoDB community forum confirms there is no way to specify ObjectID via `columnsHaveTypes`.

**What was changed:** Replaced the types list with the complete, correct set: `auto()`, `binary(base32|base64|hex)`, `boolean()`, `date(format)`, `date_go(format)`, `date_ms(format)`, `date_oracle(format)`, `decimal()`, `double()`, `int32()`, `int64()`, `string()`.

### 3. Incomplete supported types list
**What was wrong:** The post was missing several valid types: `auto()`, `binary()`, `date_go()`, and `date_oracle()`.

**What was changed:** Added all missing types to the supported types list.

## Review Notes
- The Python code examples (csv module, pymongo, pandas) are all technically correct and follow good practices (batch inserts, type conversion, NaN handling).
- The `sed 's/|/,/g'` preprocessing workaround is simple but has a caveat: if field values themselves contain commas, the conversion will break CSV parsing. The post now includes a note directing readers to the Python approach for such cases.
- The Go-style date format `2006-01-02` used in the `--columnsHaveTypes` example is correct — mongoimport is written in Go and uses Go's reference time for date parsing.
- The `--upsertFields` flag is valid and correctly documented.
