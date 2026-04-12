# Validation Summary: How to Import Pandas DataFrames into MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (BSON document storage and queries)
- Python (PyMongo driver)
- Pandas (DataFrame manipulation, `to_dict`, `read_csv`)
- NumPy (NaN handling)

## Sources Consulted
- PyMongo documentation — `insert_many`, `bulk_write`, `UpdateOne`: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html
- Pandas documentation — `DataFrame.to_dict`: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_dict.html
- Pandas documentation — `DataFrame.where`: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.where.html
- Pandas documentation — `Series.dt.to_pydatetime`: https://pandas.pydata.org/docs/reference/api/pandas.Series.dt.to_pydatetime.html
- BSON specification (IEEE 754 double / NaN support): https://bsonspec.org/spec.html
- PyMongo BSON type handling documentation: https://pymongo.readthedocs.io/en/stable/api/bson/index.html

## Issues Found
1. **Incorrect claim about MongoDB rejecting NaN** — The post stated "MongoDB does not accept Python `NaN`." This is factually incorrect. MongoDB/BSON accepts NaN as a valid IEEE 754 double value, and PyMongo will insert documents containing `float('nan')` without error. The real issue is that NaN values cause unexpected behavior in queries and comparisons (e.g., NaN != NaN, NaN values are problematic with sorting and indexing). Changed the text to accurately describe why NaN should be replaced with None.
2. **Unused `import numpy as np`** — The NaN handling code block imported `numpy as np` but never used it (the code uses `pd.notnull()` instead). Removed the unused import.

## Review Notes
- `df.where(pd.notnull(df), None)` is the most commonly recommended pattern for replacing NaN, but it has a known limitation: for numeric columns (float64, int64), `None` gets cast back to `NaN` because NumPy-backed numeric dtypes cannot hold Python `None`. The pattern works correctly for object-type (string) columns. For a fully robust solution, post-processing the dict output would be needed, but this is a well-known nuance and the pattern shown is standard practice.
- `Series.dt.to_pydatetime()` is deprecated as of pandas 2.1.0 (FutureWarning). The return type will change from ndarray to Series in a future version. The code still works but will emit a deprecation warning on pandas 2.1+.
- `pandas.Timestamp` is a subclass of `datetime.datetime`, so PyMongo handles it without explicit conversion. Similarly, `numpy.float64` is a subclass of Python `float` and works with BSON encoding. The `int64` conversion is the critical one since `numpy.int64` is NOT a subclass of Python `int` and will raise a BSON encoding error.
- The duplicate-key error handling uses `except Exception`, which works but is broader than necessary. `pymongo.errors.BulkWriteError` would be more precise. This is a style preference, not a technical error.
