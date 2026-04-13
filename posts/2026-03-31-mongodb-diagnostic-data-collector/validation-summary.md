# Validation Summary: How to Use the MongoDB Diagnostic Data Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Full-Time Diagnostic Data Capture (FTDC)
- mongod.conf configuration
- MongoDB setParameter commands
- pyftdc Python library

## Sources Consulted
- MongoDB official documentation: FTDC / Analyzing MongoDB Performance (https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/#full-time-diagnostic-data-capture)
- MongoDB official documentation: Server Parameters reference for diagnosticDataCollection* parameters (https://www.mongodb.com/docs/manual/reference/parameters/)
- MongoDB official documentation: mongodump utility (https://www.mongodb.com/docs/database-tools/mongodump/)
- PyPI package registry for ftdc-py and pyftdc (https://pypi.org/project/pyftdc/)

## Issues Found

1. **Unverifiable "metadata sample every minute" claim**: The post stated "FTDC collects a snapshot of serverStatus and other system metrics every second, and a full metadata sample every minute." The "every minute" metadata claim is not documented in official MongoDB documentation. Simplified to state that FTDC collects metrics every second by default.

2. **Incorrect mongod.conf format**: The configuration snippet showed bare key-value pairs without the required `setParameter:` nesting. In `mongod.conf` (YAML format), FTDC parameters must be nested under `setParameter:`. Fixed to show proper YAML structure.

3. **Non-existent parameter `diagnosticDataCollectionSyncPeriodSecs`**: This parameter does not exist in MongoDB's server parameter reference. The four documented FTDC parameters are `diagnosticDataCollectionEnabled`, `diagnosticDataCollectionPeriodMillis`, `diagnosticDataCollectionFileSizeMB`, and `diagnosticDataCollectionDirectorySizeMB`. Removed the fabricated parameter.

4. **Incorrect claim about mongodump decoding FTDC files**: The post stated FTDC files "require the `ftdc` tool or MongoDB's `mongodump` utilities to decode." `mongodump` is a database backup tool for exporting collection data from a running mongod instance -- it cannot read FTDC files. Corrected the description to remove this false claim.

5. **Non-existent `ftdc-py` Python package**: The post recommended `pip install ftdc-py`, but no such package exists on PyPI. Replaced with `pyftdc`, which is a real community FTDC parser available on PyPI. Updated the code example accordingly.

## Review Notes
- The default values for `diagnosticDataCollectionPeriodMillis` (1000ms), `diagnosticDataCollectionFileSizeMB` (10 MB), and `diagnosticDataCollectionDirectorySizeMB` (200 MB) are correct for standalone and replica set mongod instances. Note that in MongoDB 8.0+, mongos and sharded-cluster mongod instances have a higher default of 400 MB for the directory size cap.
- The `setParameter` runtime commands shown for enabling/disabling FTDC and changing parameters are syntactically correct.
- The FTDC data location (`diagnostic.data` subdirectory inside `dbPath`) is correct.
- The claim that FTDC files contain no user data is correct per MongoDB documentation.
