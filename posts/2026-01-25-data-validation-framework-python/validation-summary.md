# Validation Summary: How to Build a Data Validation Framework in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python dataclasses
- Python abstract base classes
- Python datetime
- Python regular expressions
- Pandas DataFrames
- Data validation framework design
- ETL/data quality validation patterns

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python abc documentation: https://docs.python.org/3/library/abc.html
- Python math documentation: https://docs.python.org/3/library/math.html
- Python re documentation: https://docs.python.org/3/library/re.html
- Pandas DataFrame.to_dict documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_dict.html
- Pandas DataFrame.loc documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.loc.html
- Pandas DataFrame.iloc documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.iloc.html
- Related OneUptime post link: https://oneuptime.com/blog/post/2026-01-25-custom-validators-pydantic-v2/view
- Related OneUptime post link: https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view
- Author GitHub profile: https://github.com/nawazdhandala

## Issues Found
- Replaced `datetime.utcnow` with `datetime.now(timezone.utc)` via a `default_factory` lambda. `datetime.utcnow` is deprecated in Python 3.12 and returns a naive datetime; the updated code creates an aware UTC timestamp.
- Fixed `ValidationResult.to_dict()` so falsey invalid values such as `0`, `False`, and empty strings are serialized instead of being converted to `None`.
- Updated `Required` to treat floating-point `NaN` as missing. This matters for Pandas workflows because missing DataFrame values commonly appear as NaN when converted to records.
- Updated `Range` to reject non-finite numbers such as `NaN`, `inf`, and `-inf`. Without this, comparisons against min/max could silently pass for NaN.
- Updated `DataFrameValidator.add_validation_columns()` to map validation row positions back to DataFrame index labels before using `.loc`. Pandas `.loc` is label-based, so using row positions directly fails or marks the wrong rows for custom indexes.

## Review Notes
The Python snippets compile successfully under Python 3.12.3, and the main non-Pandas example runs successfully after the fixes. Pandas was not installed in the local environment, so Pandas-specific behavior was reviewed against official Pandas documentation rather than executed locally.
