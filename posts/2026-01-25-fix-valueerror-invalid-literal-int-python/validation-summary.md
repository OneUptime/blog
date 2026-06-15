# Validation Summary: How to Fix 'ValueError: invalid literal for int()' in Python

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Python built-in `int()` conversion
- Python exception handling with `ValueError` and `TypeError`
- Python `decimal` module
- Python `re` module
- Python `csv.DictReader`
- Python `dataclasses`
- Python type hints

## Sources Consulted
- Python documentation: Built-in Functions, `int()` and `float()` - https://docs.python.org/3/library/functions.html
- Python documentation: Built-in Exceptions, `ValueError` and `TypeError` - https://docs.python.org/3/library/exceptions.html
- Python documentation: `decimal` module, `Decimal.to_integral_value()` and rounding modes - https://docs.python.org/3/library/decimal.html
- Python documentation: `re` module - https://docs.python.org/3/library/re.html
- Python documentation: `csv` module and `csv.DictReader` - https://docs.python.org/3/library/csv.html
- Python documentation: `dataclasses` module - https://docs.python.org/3/library/dataclasses.html

## Issues Found
- The `extract_int()` regex example was described as more robust, but it removed all non-digit and non-minus characters. Inputs with multiple minus signs, such as `"Range 10-20"`, could produce `"10-20"` and raise `ValueError` instead of returning `None` or a parsed integer. Updated the function to use `re.search()` for the first integer-like token, strip comma separators from that token, and convert it with `int()`.
- Updated the `"$1,234.56"` example output from `123456` to `1234`, matching the corrected behavior of extracting the first integer component rather than merging the decimal fraction into the integer.

## Review Notes
- The examples use modern Python syntax such as `tuple[dict, list]`, which requires Python 3.9 or later. The post does not specify older Python version support.
- Converting decimal strings through `float()` is technically correct for the shown example and truncates toward zero when passed to `int()`, but `Decimal` remains the better option when exact decimal representation matters.
