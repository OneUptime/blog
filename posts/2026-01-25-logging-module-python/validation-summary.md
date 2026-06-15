# Validation Summary: How to Use logging Module in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Python `logging` module
- Python `logging.handlers`
- Python `logging.config`
- INI-style logging configuration
- JSON structured logging

## Sources Consulted
- Python documentation: `logging` - Logging facility for Python: https://docs.python.org/3/library/logging.html
- Python documentation: Logging HOWTO: https://docs.python.org/3/howto/logging.html
- Python documentation: `logging.handlers` - Logging handlers: https://docs.python.org/3/library/logging.handlers.html
- Python documentation: `logging.config` - Logging configuration: https://docs.python.org/3/library/logging.config.html
- Python documentation: `print()` built-in function: https://docs.python.org/3/library/functions.html#print

## Issues Found
- The `print()` comparison said `print()` "goes to stdout only." Python's `print()` defaults to `sys.stdout`, but it can write to another file-like object via the `file` parameter. Updated the wording to "Defaults to stdout."

## Review Notes
The logging examples use current standard-library APIs and match the documented behavior for log levels, handlers, formatters, logger adapters, `dictConfig()`, and `fileConfig()`. The exception example demonstrates both `logger.error(..., exc_info=True)` and `logger.exception(...)`; in real code, use one of those forms for a given exception to avoid duplicate stack-trace logs.
