# Validation Summary: How to Use Pydantic for Data Validation in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Pydantic v2
- Pydantic Settings
- Email validation with `pydantic[email]`
- Pydantic field constraints, validators, serialization, generics, computed fields, and discriminated unions

## Sources Consulted
- Pydantic Settings documentation: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- Pydantic configuration documentation: https://docs.pydantic.dev/latest/concepts/config/
- Pydantic v2 migration guide: https://docs.pydantic.dev/latest/migration/
- Pydantic validators documentation: https://docs.pydantic.dev/latest/concepts/validators/
- Pydantic serialization documentation: https://docs.pydantic.dev/latest/concepts/serialization/
- Pydantic fields API documentation: https://docs.pydantic.dev/latest/api/fields/
- Pydantic unions documentation: https://docs.pydantic.dev/latest/concepts/unions/
- Pydantic models documentation: https://docs.pydantic.dev/latest/concepts/models/

## Issues Found
- Added `pip install pydantic-settings` to the installation commands because `BaseSettings` is provided by the separate `pydantic-settings` package in Pydantic v2.
- Replaced the deprecated inner `Config` class in the serialization example with `ConfigDict` and `model_config`, matching the Pydantic v2 configuration style.
- Corrected the settings example so the nested database configuration uses `DATABASE__...` variables with `env_nested_delimiter`, and changed the list environment variable example to JSON because complex settings values are JSON-decoded by default.
- Fixed the generic model example by importing `Field`, which was required for the `timestamp` default factory.
- Replaced `datetime.utcnow` with a timezone-aware `datetime.now(timezone.utc)` default factory in the generic response example.
- Updated `scheduled_at` in the discriminated union example to `Optional[datetime] = None` so the type annotation matches the nullable default.

## Review Notes
All Python code blocks were executed successfully with Pydantic 2.13.4 and pydantic-settings 2.14.1 after the fixes. The settings example was tested with a temporary `.env` file matching the snippet.
