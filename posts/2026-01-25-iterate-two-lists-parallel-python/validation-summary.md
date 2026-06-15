# Validation Summary: How to Iterate Over Two Lists in Parallel in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Built-in `zip()`, `enumerate()`, `map()`, `dict()`, `range()`, and `list()`
- `itertools.zip_longest()`
- `operator.add`

## Sources Consulted
- Python built-in functions documentation: https://docs.python.org/3/library/functions.html
- Python `itertools.zip_longest()` documentation: https://docs.python.org/3/library/itertools.html#itertools.zip_longest
- PEP 618, Add Optional Length-Checking To zip: https://peps.python.org/pep-0618/

## Issues Found
- The first `enumerate()` example attempted to unpack each item from `names` as `(name, age)` while iterating over `enumerate(names)`. Because `enumerate(names)` yields `(index, name)` pairs, this code raises `ValueError` for names whose string length is not exactly two. Changed the loop to `for index, name in enumerate(names):`, which matches Python's documented `enumerate()` behavior and the example's intended output.

## Review Notes
- The remaining examples and explanations are technically correct for current Python. The post correctly notes that `zip(..., strict=True)` was added in Python 3.10 and that default `zip()` and `map()` behavior stops at the shortest iterable.
