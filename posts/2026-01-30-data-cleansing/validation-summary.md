# Validation Summary: How to Create Data Cleansing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- pandas
- NumPy
- Great Expectations installation package
- Python standard library: logging, hashlib, datetime, difflib, re
- Mermaid diagrams

## Sources Consulted
- pandas DataFrame.dropna documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.dropna.html
- pandas DataFrame.fillna documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.fillna.html
- pandas DataFrame.drop_duplicates documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.drop_duplicates.html
- pandas DataFrame.select_dtypes documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.select_dtypes.html
- pandas api.types.is_numeric_dtype documentation: https://pandas.pydata.org/docs/reference/api/pandas.api.types.is_numeric_dtype.html
- pandas to_datetime documentation: https://pandas.pydata.org/docs/reference/api/pandas.to_datetime.html
- pandas DataFrame.astype documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.astype.html
- NumPy installation documentation: https://numpy.org/install/
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- Python difflib documentation: https://docs.python.org/3/library/difflib.html

## Issues Found
- The complete pipeline example deduplicated only exact full-row duplicates, but the validation example checked that `customer_id` values were unique. With the sample data, this caused `validator.check_unique_values('customer_id')` to fail. I updated the pipeline to accept a `dedupe_subset` configuration value and changed the example instantiation to deduplicate on `['customer_id']`, matching the later validation check.

## Review Notes
The Python examples were executed together after installing the referenced packages into a temporary package directory. The final validation report now passes. Some examples are intentionally simplified for a tutorial; in production, identifier columns such as `customer_id` usually should not be imputed with a median value unless there is a domain-specific reason.
