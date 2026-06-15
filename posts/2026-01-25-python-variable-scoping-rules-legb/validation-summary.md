# Validation Summary: How to Understand Python Variable Scoping Rules (LEGB)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Python name resolution and scope rules
- `global` and `nonlocal` statements
- Closures
- Class and comprehension scope
- Built-in functions and constants

## Sources Consulted
- Python Language Reference: Execution model - https://docs.python.org/3/reference/executionmodel.html
- Python Language Reference: The `global` and `nonlocal` statements - https://docs.python.org/3/reference/simple_stmts.html#the-global-statement and https://docs.python.org/3/reference/simple_stmts.html#the-nonlocal-statement
- Python Standard Library: Built-in Functions - https://docs.python.org/3/library/functions.html
- Python FAQ: Local/global variables and late binding in loops - https://docs.python.org/3/faq/programming.html

## Issues Found
- The post listed `file` as a common built-in name to avoid shadowing. That was accurate for Python 2, but `file` is not a built-in in Python 3. I removed `file` from the list while leaving the Python 3 built-ins such as `open`, `range`, `filter`, `map`, `sorted`, `reversed`, `next`, and `iter`.

## Review Notes
All Python code examples were checked under Python 3.12.3 and executed successfully. The explanations of LEGB lookup, `global`, `nonlocal`, closure late binding, class scope, list comprehension scope in Python 3, `locals()`, and `globals()` are consistent with the official Python documentation.
