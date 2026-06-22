# Validation Summary: How to Fix 'IndentationError' in Python

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Python
- Python `IndentationError` and `TabError`
- Python `tabnanny`
- PEP 8
- VS Code editor settings
- autopep8
- Black
- Flake8
- pre-commit configuration
- sed

## Sources Consulted
- Python lexical analysis documentation: https://docs.python.org/3/reference/lexical_analysis.html
- Python built-in exceptions documentation: https://docs.python.org/3/library/exceptions.html
- Python `tabnanny` documentation: https://docs.python.org/3/library/tabnanny.html
- Python 3 command-line documentation: https://docs.python.org/3/using/cmdline.html
- Python 2.7 command-line documentation for historical `-tt` behavior: https://docs.python.org/2.7/using/cmdline.html
- PEP 8 style guide: https://peps.python.org/pep-0008/
- VS Code basic editing documentation: https://code.visualstudio.com/docs/editing/codebasics
- VS Code tips and tricks documentation: https://code.visualstudio.com/docs/editing/tips-and-tricks
- Black documentation: https://black.readthedocs.io/en/stable/
- Flake8 documentation: https://flake8.pycqa.org/en/latest/
- PyPI package metadata for current Black, Flake8, and autopep8 versions: https://pypi.org/

## Issues Found
- The multi-line statement example labeled inconsistent continuation indentation as "WRONG" in a section about `IndentationError`, but Python permits varied continuation indentation inside parentheses. Changed the comment to identify it as a style issue rather than a syntax error.
- The autopep8 and summary text implied formatters automatically fix indentation errors generally. Formatters normally require parseable Python and mainly keep valid code consistently formatted or fix style issues. Updated the wording to avoid overpromising.
- The pre-commit examples pinned old Black and Flake8 versions. Updated Black to `26.5.1` and Flake8 to `7.3.0`, matching current package metadata checked during review.
- The debugging section recommended `python -tt script.py`. `-tt` is historical Python 2 behavior and is not documented as a Python 3 command-line option. Replaced it with `python script.py` and clarified that Python 3 raises `TabError` for inconsistent tabs/spaces.
- The `Protocol` example used `Protocol` without importing it. Added `from typing import Protocol` so the snippet is self-contained.

## Review Notes
The intentionally broken examples are appropriate for demonstrating specific `IndentationError` messages. Some snippets still use placeholder names such as `condition`, `arg1`, and `some_long_function_name`; these are acceptable for illustrating indentation and style, but they are not standalone programs without surrounding definitions.
