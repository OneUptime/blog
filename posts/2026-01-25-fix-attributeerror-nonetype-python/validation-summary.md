# Validation Summary: How to Fix 'AttributeError: NoneType' in Python

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Python
- Python built-in exceptions and `None`
- Dictionaries and lists
- Regular expressions with `re`
- `getattr()`
- Type hints with `typing.Optional`
- Requests library

## Sources Consulted
- Python documentation: Simple statements, `return` statement - https://docs.python.org/3/reference/simple_stmts.html#the-return-statement
- Python documentation: Built-in types, dictionary `get()` and list `sort()` - https://docs.python.org/3/library/stdtypes.html
- Python documentation: `re` module match objects and `re.search()` behavior - https://docs.python.org/3/library/re.html
- Python documentation: Built-in function `getattr()` - https://docs.python.org/3/library/functions.html#getattr
- Python documentation: Python 3.8 assignment expressions - https://docs.python.org/3/whatsnew/3.8.html#assignment-expressions
- Requests documentation: Developer interface, `requests.get()`, `Response.raise_for_status()`, and exceptions - https://requests.readthedocs.io/en/latest/api/

## Issues Found
- The list `sort()` example used `sorted_numbers[0]` after assigning the return value of `numbers.sort()`. Since subscription on `None` raises `TypeError`, not `AttributeError`, this was changed to `sorted_numbers.append(2)` so the example correctly demonstrates `AttributeError`.
- The file/config example used `config["database"]["host"]` when `config` was `None`. Since subscription on `None` raises `TypeError`, not `AttributeError`, this was changed to `config.get("database")["host"]` so the example correctly demonstrates `AttributeError`.
- The heading "Using Optional Chaining with getattr()" was technically imprecise because Python does not have an optional chaining operator. It was changed to "Using Safe Attribute Access with getattr()".
- The Null Object Pattern snippet referenced `User` without defining it in the same code block. A minimal `User` class definition was added so the snippet runs as shown.
- The summary table entry for list methods was ambiguous. It now states that in-place methods should be called separately or `sorted()` should be used when a returned sorted list is needed.

## Review Notes
The chained dictionary-access example can raise `TypeError` when a `None` value is subscripted, and the post already notes `TypeError/AttributeError` for that case. The API example is structurally correct for the intended response shape; production code may also want to validate that `response.json()` returned a dictionary before calling `.get()`.
