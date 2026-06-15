# Validation Summary: How to Use Decorators in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python decorators
- Python functions and methods
- `functools.wraps`
- `functools.cache`
- `functools.lru_cache`
- `time.perf_counter`
- Python `logging`

## Sources Consulted
- Python Glossary: decorator - https://docs.python.org/3/glossary.html#term-decorator
- Python Language Reference: function definitions and decorators - https://docs.python.org/3/reference/compound_stmts.html#function-definitions
- Python `functools` documentation - https://docs.python.org/3/library/functools.html
- Python `time.perf_counter` documentation - https://docs.python.org/3/library/time.html#time.perf_counter
- Python `logging.basicConfig` documentation - https://docs.python.org/3/library/logging.html#logging.basicConfig

## Issues Found
- Clarified the decorator definition from always returning a new function to returning a callable. Python's function definition reference specifies that decorator expressions must evaluate to a callable and that the returned value is bound to the function name.
- Clarified the memoization cache-key comment to mention hashable arguments. The cache key expression works for the demonstrated Fibonacci example, but like `functools.lru_cache`, it requires hashable argument values.
- Clarified the built-in cache note to specify that `functools.cache` was added in Python 3.9 and `functools.lru_cache` has been available since Python 3.2.

## Review Notes
All code examples were checked for syntax and runtime behavior with Python 3.12.3. The examples are suitable for demonstration purposes. In production code, retry decorators should usually catch narrower exception types, and custom memoization decorators should document cache growth and hashability constraints.
