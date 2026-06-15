# Validation Summary: How to Fix 'IndexError: list index out of range' in Python

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Python
- Python lists and sequence indexing
- Python strings
- Python built-in functions: `range`, `enumerate`, `zip`, `filter`, `len`
- Python `itertools.zip_longest`
- Python type hints from `typing`

## Sources Consulted
- Python documentation: Built-in Exceptions, `IndexError` - https://docs.python.org/3/library/exceptions.html#IndexError
- Python documentation: Built-in Types, common sequence operations - https://docs.python.org/3/library/stdtypes.html#common-sequence-operations
- Python documentation: Data Structures, lists and list methods - https://docs.python.org/3/tutorial/datastructures.html
- Python documentation: Built-in Functions, `range`, `enumerate`, `zip`, `filter`, `len` - https://docs.python.org/3/library/functions.html
- Python documentation: `itertools.zip_longest` - https://docs.python.org/3/library/itertools.html#itertools.zip_longest

## Issues Found
- The `last_n` helper used `lst[-n:] if lst else []`, which returns the entire list when `n` is `0` because `-0` is `0` in Python. Changed it to return a slice only when `n > 0`, otherwise return an empty list.
- The `DataProcessor.get_column` helper checked `len(row) > col`, which allowed invalid negative indexes such as `col = -10` and could still raise `IndexError`. Changed the bounds check to `-len(row) <= col < len(row)` so both positive and negative column indexes are handled safely.

## Review Notes
The main explanation of zero-based indexing, negative indexes, out-of-range `IndexError`, slice bounds behavior, direct iteration, `enumerate`, `zip`, and `zip_longest` matches the official Python documentation. The examples are generally current for modern Python. One future improvement would be to document whether helper methods intentionally support negative indexes or only non-negative user-facing indexes.
