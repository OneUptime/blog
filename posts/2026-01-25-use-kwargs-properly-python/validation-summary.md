# Validation Summary: How to Use **kwargs Properly in Python Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python function definitions
- Python keyword arguments and `**kwargs`
- Dictionary unpacking with `**`
- Python dictionaries
- Python decorators with `functools.wraps`
- Python logging

## Sources Consulted
- Python Tutorial: More on Defining Functions - https://docs.python.org/3/tutorial/controlflow.html#more-on-defining-functions
- Python Language Reference: Calls - https://docs.python.org/3/reference/expressions.html#calls
- Python Language Reference: Function definitions - https://docs.python.org/3/reference/compound_stmts.html#function-definitions
- Python Standard Library: Mapping Types - `dict` - https://docs.python.org/3/library/stdtypes.html#mapping-types-dict
- Python Standard Library: `logging` - https://docs.python.org/3/library/logging.html
- Python Standard Library: `functools.wraps` - https://docs.python.org/3/library/functools.html#functools.wraps

## Issues Found
- The `configure()` example showed `verbose` remaining in `kwargs` even though it was only read with `.get()` and was never passed by the caller. Updated the expected output to match actual Python behavior.
- The logger factory example referenced `logging.DEBUG` in top-level example code, but `logging` was imported only inside `create_logger()`, making the example raise `NameError`. Moved `import logging` to the top of the code block.
- The "Modifying kwargs Unintentionally" example claimed that changing `kwargs` modifies the caller's dictionary when passed with `**`. Python creates a new mapping for collected excess keyword arguments, so this claim was inaccurate. Updated the comment to describe the real issue: modifying the collected `kwargs` before returning it.

## Review Notes
- The `process_data()` example references placeholder functions such as `normalize()`, `fill_missing()`, and `drop_duplicates()`. This is acceptable for a conceptual validation example because the demonstrated typo path raises before those helpers are called.
- The `QueryBuilder` example demonstrates chaining, but it should not be used as production SQL construction because it interpolates values directly into SQL text.
