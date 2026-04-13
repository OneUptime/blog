# Validation Summary: How to Export MongoDB Data to Parquet Format

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (pymongo driver)
- Apache Parquet (via pyarrow)
- Python (pandas, pyarrow, bson)
- PyArrow Dataset API (partitioned writes)

## Sources Consulted
- PyMongo official documentation: https://pymongo.readthedocs.io/en/stable/
- PyArrow documentation (Table.from_pylist, ParquetWriter, write_table, dataset API): https://arrow.apache.org/docs/python/
- Pandas documentation (DataFrame.to_parquet, read_parquet): https://pandas.pydata.org/docs/
- Python bson module (ObjectId): https://pymongo.readthedocs.io/en/stable/api/bson/

## Issues Found
1. **Missing `import pymongo` in streaming export code block**: The "Streaming Export for Large Collections" section used `pymongo.MongoClient` but did not include `import pymongo` in its imports. Added the missing import statement.

## Review Notes
- The first code block imports `pyarrow as pa` and `pyarrow.parquet as pq` but uses `df.to_parquet()` (pandas) instead. These imports are unused in that block but not harmful since pyarrow must be installed as the parquet engine — this is a minor style observation, not an error.
- All PyArrow APIs used (`Table.from_pylist`, `ParquetWriter`, `write_table`, `ds.write_dataset`, `ds.partitioning`) are current and non-deprecated.
- The `batch_size()` cursor method, `compression="snappy"`, and `existing_data_behavior="overwrite_or_ignore"` parameters are all correct per current library versions.
- The dict mutation pattern in the streaming export (modifying values during `doc.items()` iteration) is safe in Python 3 since only values are changed, not keys.
