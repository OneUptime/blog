# Validation Summary: How to Import a Large JSON File into MongoDB Efficiently

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- mongoimport (MongoDB Database Tools)
- JSON / JSON Lines format
- jq (command-line JSON processor)
- Python 3 (pymongo, ijson)
- mongosh
- mongostat

## Sources Consulted
- MongoDB Database Tools documentation for mongoimport: https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB mongoimport examples: https://www.mongodb.com/docs/database-tools/mongoimport/mongoimport-examples/
- PyMongo documentation for bulk_write: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.bulk_write
- MongoDB manual for createIndex and dropIndex: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found
1. **Python JSON-array-to-JSONL converter was not actually streaming**: The post described a Python script as an alternative "for very large files where jq loads the whole file," implying the Python approach avoids loading the entire file into memory. However, the script used `f.read()` which loads the entire file into memory — the same limitation as jq. Replaced the script with an `ijson`-based solution that genuinely streams the file without loading it all into memory.

## Review Notes
- The `--batchSize 1000` example in the mongoimport tuning section specifies the default value (1000), so it has no effect unless changed. This is not incorrect but could be noted as a no-op at the default value.
- The `--type json` flag in the JSON Lines example is the default type for mongoimport and is technically redundant, though including it for clarity is a reasonable choice.
- The pymongo streaming import script prints "Inserted {line_num} documents" where `line_num` is the file line number, not the actual count of inserted documents (blank lines are skipped). This is a minor inaccuracy in the progress message but does not affect functionality.
