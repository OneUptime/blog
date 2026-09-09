# Validation Summary: Handle Missing Endpoints When Loading DataFrames into Kuzu

## Status
validated

## Post Type
Tutorial / troubleshooting guide with executable Python and Cypher examples.

## Technologies Covered
- Kuzu 0.11.3 graph database and Python API
- Python
- pandas DataFrames and nullable integer columns
- Cypher schema inspection, COPY imports, and transactions

## Sources Consulted
- [Kuzu DataFrame import guide](https://kuzudb.github.io/docs/import/copy-from-dataframe/): parameter-based COPY and supported import error handling.
- [Kuzu import overview](https://kuzudb.github.io/docs/import/): error policies, warning facilities, and source-specific limitations.
- [Kuzu transactions](https://kuzudb.github.io/docs/cypher/transaction/): manual read-write transactions, atomicity, and single-writer behavior.
- [Kuzu Python API](https://kuzudb.github.io/docs/client-apis/python/): database, connection, and query-result APIs.
- [Kuzu 0.11.3 show_connection implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/show_connection.cpp): endpoint table names and primary-key metadata. Retrieved the corresponding raw source successfully.
- [Kuzu 0.11.3 NumPy dtype conversion implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_cpp/numpy/numpy_type.cpp): recognizes object/string dtype names but not pandas 3's inferred str dtype.
- [pandas 3.0 release notes](https://pandas.pydata.org/docs/whatsnew/v3.0.0.html): changed default string inference.
- [pandas Series.isin](https://pandas.pydata.org/docs/reference/api/pandas.Series.isin.html): membership testing used for endpoint validation.
- [pandas nullable integer guide](https://pandas.pydata.org/docs/user_guide/integer_na.html): explicit Int64 columns and missing values.

## Issues Found
- The node fixture relied on automatic string dtype inference. With Kuzu 0.11.3 and pandas 3.0.5, the original example failed at COPY Person with a dtype-conversion assertion in numpy_type.cpp. Changed the name column to an explicit pandas Series with dtype="object" and added a short explanatory comment. This preserves the fixture's data while using a dtype supported by Kuzu 0.11.3. No other technical errors were found.

## Review Notes
- Executed the corrected Python example with Python 3.13.1, Kuzu 0.11.3, NumPy 2.5.3, and both pandas 2.3.3 and 3.0.5. Its assertions passed: three submitted rows, one accepted row, two rejected rows, and one stored relationship.
- With pandas 3.0.5, additionally executed both catalog queries. show_connection returned Person-to-Person endpoints with id primary keys; table_info confirmed the INT64 primary key and STRING name property.
- Verified the stored relationship's source, destination, and weight as [1, 2, 1.0], confirming input column ordering and property preservation.
- The unknown source 9 and null source were rejected with missing_source=true and missing_destination=false.
- BEGIN TRANSACTION starts a read-write transaction; Kuzu's single-writer model supports the post's endpoint-inspection/insertion explanation. Node import can be included in that transaction when whole-load atomicity is required.
- IGNORE_ERRORS does not suppress DataFrame parsing or casting failures. The post correctly limits its claim to certain malformed rows and requires loaded-count reconciliation. Warnings are connection-scoped and bounded, so they are not a substitute for a durable quarantine artifact.
- The example deliberately retains rejected rows in memory and prints them. Durable storage, stable source row identifiers, and retry deduplication remain production responsibilities already identified in the post.
- Validation is scoped to the stated Kuzu 0.11.3 release. The corrected fixture works on the two pandas versions tested; this is not a claim of compatibility with every pandas dtype or version.
- The documentation links resolve to the intended resources; the versioned endpoint source was verified through its raw GitHub URL when the browser fetch failed.
