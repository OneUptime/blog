# Validation Summary: How to Create Metaclasses in Python

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Python (3.x, with notes on 3.6+ features)
- Python `type` built-in / metaclass protocol
- Python `__new__`, `__init__`, `__call__`, `__init_subclass__` hooks
- `datetime` standard library module

## Sources Consulted
- Python Language Reference, Data model — Metaclasses: https://docs.python.org/3/reference/datamodel.html#metaclasses
- Python Language Reference, Customizing class creation (`__init_subclass__`): https://docs.python.org/3/reference/datamodel.html#customizing-class-creation
- PEP 487 — Simpler customisation of class creation: https://peps.python.org/pep-0487/
- Python `type` documentation: https://docs.python.org/3/library/functions.html#type
- Python `datetime` documentation (utcnow deprecation in 3.12): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- Local execution of all code samples with Python 3.12 to verify behavior and outputs

## Issues Found
- `datetime.utcnow()` used in the `TimestampMeta` example (`injection_metaclass.py`) is deprecated in Python 3.12 and scheduled for removal in a future version. Replaced both call sites and the `import` with the timezone-aware equivalents: `from datetime import datetime, timezone` and `datetime.now(timezone.utc)`. Verified the rewritten example produces correctly timestamped instances and the injected `touch()` method updates `updated_at` as expected.

## Review Notes
- All other code examples (`metaclass_basics.py`, `simple_metaclass.py`, `registry_metaclass.py`, `interface_metaclass.py`, `singleton_metaclass.py`, `init_subclass_example.py`) were executed and produce exactly the outputs shown in the comments, including the dict-insertion-ordered `['json', 'xml', 'csvexporter']` registry listing (guaranteed since Python 3.7).
- The `LoggingMeta` example's expected `namespace` keys (`['__module__', '__qualname__', 'speak']`) match the actual Python 3.12 output.
- The claim that `__init_subclass__` was introduced in Python 3.6 (PEP 487) is correct.
- The `InterfaceMeta` example defines `required_methods = []` on the metaclass itself, which is technically unused (the validation reads `cls.required_methods` from the user class). It is not incorrect — left as-is to preserve the author's style.
- Description of class creation flow (metaclass `__new__` then `__init__`, and `__call__` invoked on instantiation) matches the Python data model documentation.
