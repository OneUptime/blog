# Validation Summary: How to Export MongoDB Data to Pandas DataFrames

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (PyMongo driver)
- Python
- Pandas (DataFrames, json_normalize, to_csv)
- PyArrow
- PyMongoArrow

## Sources Consulted
- PyMongo official documentation: https://pymongo.readthedocs.io/en/stable/
- Pandas official documentation: https://pandas.pydata.org/docs/
- PyMongoArrow source code on GitHub: https://github.com/mongodb-labs/mongo-arrow
- PyMongoArrow API reference (monkey.py, api.py): https://github.com/mongodb-labs/mongo-arrow/blob/main/bindings/python/pymongoarrow/api.py
- MongoDB PyMongoArrow Quick Start: https://www.mongodb.com/docs/languages/python/pymongo-arrow-driver/current/quick-start/

## Issues Found
1. **Incorrect PyMongoArrow API usage** (line 137): The code used `col.find({"status": "completed"}, schema=schema).to_pandas()`, which is incorrect. After `patch_all()`, PyMongoArrow does NOT modify PyMongo's `find()` method to accept a `schema` parameter, nor does the returned cursor have a `to_pandas()` method. The correct API is `col.find_pandas_all({"status": "completed"}, schema=schema)`, which is one of the standalone methods (`find_pandas_all`, `find_arrow_all`, `find_numpy_all`, `find_polars_all`) that `patch_all()` adds to PyMongo's `Collection` class. Fixed to use `find_pandas_all()`.

## Review Notes
- The chunked export approach works but note that `batch_size()` controls the wire protocol batch size (how many documents are fetched per network round trip), while the application-level chunking is handled separately in the loop. The code is correct but readers should understand these are two different concepts.
- The `customerId` conversion to string in the "Converting ObjectId to String" section assumes `customerId` contains ObjectId values. This is a reasonable assumption for the example but may not apply to all schemas.
- All other code examples (basic export, field selection, aggregation, json_normalize, chunked export, CSV export, ObjectId conversion) are syntactically and semantically correct.
