# Validation Summary: How to Read User Input as Numbers in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python built-in `input()`
- Python built-in `int()` and `float()`
- Python exception handling
- Basic command-line input validation

## Sources Consulted
- Python 3.14 documentation: Built-in Functions (`input()`, `int()`, `float()`) - https://docs.python.org/3/library/functions.html
- Python 3.14 documentation: Built-in Types - https://docs.python.org/3/library/stdtypes.html

## Issues Found
- The first example described `age + 1` as "String concatenation, not addition", but adding a `str` and an `int` raises `TypeError`; it does not concatenate. Changed the comment to "TypeError, not addition" to match the actual behavior and the inline exception shown.

## Review Notes
- All Python code blocks were syntax-checked with Python 3.12.3 and parsed successfully.
- The calculator's `get_number()` function intentionally uses a beginner-friendly decimal-point check to choose between `int()` and `float()`. It works for ordinary integer and decimal input, but it does not accept every string that `float()` can parse, such as `1e3`, `inf`, or `nan`.
