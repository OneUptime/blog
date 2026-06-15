# Validation Summary: How to Sort a Dictionary by Value in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python dictionaries
- Python built-in `sorted()` function
- Python `operator.itemgetter`
- Python `heapq.nlargest` and `heapq.nsmallest`
- Python `collections.Counter`
- Python `timeit`

## Sources Consulted
- Python documentation: Built-in `sorted()` function - https://docs.python.org/3/library/functions.html#sorted
- Python documentation: Dictionary type and insertion order - https://docs.python.org/3/library/stdtypes.html#dict
- Python documentation: `operator.itemgetter` - https://docs.python.org/3/library/operator.html#operator.itemgetter
- Python documentation: `heapq.nlargest` and `heapq.nsmallest` - https://docs.python.org/3/library/heapq.html#heapq.nlargest
- Python documentation: Sorting HOWTO - https://docs.python.org/3/howto/sorting.html

## Issues Found
- The post claimed that `itemgetter` is typically 20-30% faster than an equivalent lambda and summarized that `itemgetter(1)` is faster than `lambda x: x[1]`. This is environment-dependent and not guaranteed by the official documentation. I changed the wording to say that `itemgetter` can be faster, depending on Python version and data.

## Review Notes
All code examples were run successfully with Python 3.12.3. The dictionary insertion-order statement is correct for Python 3.7 and later. The `heapq.nlargest` and `heapq.nsmallest` guidance is technically correct for small `n` relative to the input size; for larger `n`, the official documentation recommends `sorted()`.
