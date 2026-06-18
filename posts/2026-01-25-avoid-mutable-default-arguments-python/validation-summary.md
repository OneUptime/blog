# Validation Summary: How to Avoid Mutable Default Arguments Bug in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python default arguments
- Python mutable objects
- Python dataclasses
- Python type hints
- functools.lru_cache
- Pylint

## Sources Consulted
- Python Language Reference: Function definitions, default parameter evaluation: https://docs.python.org/3/reference/compound_stmts.html#function-definitions
- Python Tutorial: Default argument values and mutable default warning: https://docs.python.org/3/tutorial/controlflow.html#default-argument-values
- Python dataclasses documentation for `field(default_factory=...)` and mutable defaults: https://docs.python.org/3/library/dataclasses.html
- Python functools documentation for `lru_cache(maxsize=None)`: https://docs.python.org/3/library/functools.html#functools.lru_cache
- Pylint documentation for `dangerous-default-value / W0102`: https://pylint.pycqa.org/en/latest/user_guide/messages/warning/dangerous-default-value.html

## Issues Found
- The dataclass example commented that `items: List[str] = []` would cause the same shared mutable default bug. In current Python dataclasses, mutable defaults such as lists are rejected at class creation and `default_factory` is required. Updated the comment to say dataclasses reject mutable defaults.
- The sentinel example said the sentinel "cannot be passed by callers." A module-level sentinel can still be passed if a caller has access to it, so the comment was revised to say callers are unlikely to pass it accidentally.
- The linter section said setup would prevent this class of bugs entirely. Linters help catch common mutable defaults, but they are not a complete guarantee for every pattern, so the wording was changed to "help prevent."

## Review Notes
All Python code snippets were run successfully under Python 3.12.3 after accounting for the intentionally illustrative comments. The post's central explanation matches the official Python reference: default parameter values are evaluated once when the function definition is executed and reused on later calls.
