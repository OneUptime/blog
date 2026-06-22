# Validation Summary: How to Create Custom Exceptions in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python exceptions and exception chaining
- Flask error handlers

## Sources Consulted
- Python documentation: Built-in Exceptions - https://docs.python.org/3/library/exceptions.html
- Python documentation: Errors and Exceptions - https://docs.python.org/3/tutorial/errors.html
- Flask documentation: Handling Application Errors - https://flask.palletsprojects.com/en/stable/errorhandling/
- Flask documentation: API - https://flask.palletsprojects.com/en/stable/api/

## Issues Found
- The best-practices section said inheriting from `BaseException` "catches KeyboardInterrupt and SystemExit." Defining a custom exception class from `BaseException` does not itself catch those exceptions. I changed the comment to state that `BaseException` is reserved for exceptions that usually should not be caught, which matches Python's guidance to derive user-defined exceptions from `Exception`.

## Review Notes
- Python code blocks were checked for syntax validity with Python 3.12.3.
- Several examples use placeholder application objects or functions such as `api_request`, `database`, `logger`, `jsonify`, `PaymentGatewayError`, and `json`. These are acceptable for tutorial snippets, but a fully runnable sample would need imports and surrounding application setup.
- The custom `ConnectionError` example shadows Python's built-in `ConnectionError` name in that snippet. It is valid Python, but a module-specific name such as `DatabaseConnectionError` would avoid ambiguity in production code.
