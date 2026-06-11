# Validation Summary: How to Build Dataclass Validators in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (dataclasses module)
- Python typing module (Optional, Annotated, TypeVar, Generic, get_type_hints, get_origin, get_args)
- Python descriptors (`__set_name__`, `__get__`, `__set__`)
- Pydantic v2 (`pydantic.dataclasses.dataclass`, `field_validator`, `model_validator`)
- Python regex (`re` module)
- Python `dataclasses.field` metadata
- Python `enum.Enum`
- Python `abc` (ABC, abstractmethod)

## Sources Consulted
- Python dataclasses official documentation: https://docs.python.org/3/library/dataclasses.html
- Python data model — Descriptors: https://docs.python.org/3/reference/datamodel.html#implementing-descriptors
- Python typing.Annotated: https://docs.python.org/3/library/typing.html#typing.Annotated
- Pydantic v2 validators: https://docs.pydantic.dev/latest/concepts/validators/
- Pydantic v2 dataclasses: https://docs.pydantic.dev/latest/concepts/dataclasses/
- ITU-T E.164 phone numbering plan (for phone regex check)

## Issues Found

1. **`NumberConstraints.lt` validation logic inverted (Approach 3).**
   The original code raised an error when `value < self.lt`, which is the opposite of what "less than" means. For a constraint of `lt=10`, a value should fail when it is `>= 10`, not when it is `< 10`. Fixed the comparison to `value >= self.lt`. The `gt`, `ge`, and `le` branches were already correct.

2. **`PydanticUser.tags` and `PydanticUser.created_at` had `None` defaults but non-Optional type hints (Approach 4).**
   In Pydantic v2, declaring `tags: List[str] = None` would raise a validation error because the type `List[str]` does not include `None`. Updated to `Optional[List[str]] = None` and `Optional[datetime] = None`. `Optional` was already imported from `typing` in the same code block.

## Review Notes

- The use of `@dataclass` together with a manually overridden `__init__` in the `Product` example (Approach 2) is functional but somewhat unidiomatic — the dataclass-generated `__init__` is fully replaced, leaving the descriptor pattern to do the actual work via `__set__`. The `__repr__`/`__eq__` benefits of `@dataclass` are retained, so this is fine to leave as a teaching example.
- The custom `field_validator` in Approach 5 shadows the Pydantic `field_validator` imported in Approach 4. Each code block is self-contained, so this is not a runtime issue, but readers combining snippets in a single REPL session should be aware.
- The phone number regex `r'^\+?[1-9]\d{1,14}$'` correctly enforces the E.164 maximum of 15 digits (1 leading + 1–14 trailing).
- Pydantic v2 `@field_validator` + `@classmethod` and `@model_validator(mode='after')` syntax verified against current Pydantic docs.
- In `validated_field`, fields default to `None` to allow `Required()` to surface a clear error during validation; the type annotation (e.g. `str`) does not include `None`, so strict type checkers would flag this, but it is consistent with the framework's "report all errors at once" goal.
