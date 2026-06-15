# Validation Summary: How to Create Reproducible Pandas Examples for Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- pandas
- NumPy
- CSV parsing with `StringIO`
- pandas `DataFrame`, `MultiIndex`, `date_range`, `groupby`, dtype, and memory usage APIs

## Sources Consulted
- pandas 3.0.3 `DataFrame` API documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html
- pandas 3.0.3 `read_csv` API documentation: https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html
- pandas 3.0.3 `date_range` API documentation: https://pandas.pydata.org/docs/reference/api/pandas.date_range.html
- pandas 3.0.3 time series offset aliases documentation: https://pandas.pydata.org/docs/user_guide/timeseries.html#offset-aliases
- pandas 3.0.3 `MultiIndex.from_product` API documentation: https://pandas.pydata.org/docs/reference/api/pandas.MultiIndex.from_product.html
- pandas 3.0.3 `MultiIndex.from_tuples` API documentation: https://pandas.pydata.org/docs/reference/api/pandas.MultiIndex.from_tuples.html
- pandas 3.0.0 release notes for default string dtype behavior: https://pandas.pydata.org/docs/whatsnew/v3.0.0.html#dedicated-string-data-type-by-default
- NumPy random Generator documentation: https://numpy.org/doc/stable/reference/random/generator.html

## Issues Found
- Updated pandas dtype output examples from `object` to `str` where pandas 3.0 infers string columns as the dedicated string dtype by default.
- Updated datetime dtype output examples from `datetime64[ns]` to `datetime64[us]` to match pandas 3.0.3 behavior for the shown inputs.
- Replaced outdated offset alias examples using `H` and `M` with current aliases `h` and `ME`.
- Corrected the CSV dtype example: `true` and `false` are parsed as booleans by pandas, so the example now uses `enabled` and `disabled` to demonstrate a string flag column.
- Corrected the MultiIndex example to use `MultiIndex.from_product` for Cartesian-product generation. The previous text said it generated all combinations while using `from_arrays`, which constructs a MultiIndex from parallel arrays instead.
- Replaced the private `pandas._testing` helper example with public pandas and NumPy APIs. Private testing helpers are not appropriate for current user-facing examples.

## Review Notes
Representative examples were executed with pandas 3.0.3 and NumPy installed into a temporary target directory. The intentional `ZeroDivisionError` example remains as-is because it demonstrates an error to include in an MRE.
