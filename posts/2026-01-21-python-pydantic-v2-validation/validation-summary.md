# Validation Summary: How to Validate Data with Pydantic v2 Models

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Pydantic v2
- pydantic-settings
- FastAPI
- Data validation
- Serialization and deserialization
- Settings management

## Sources Consulted
- Pydantic Models documentation: https://docs.pydantic.dev/latest/concepts/models/
- Pydantic Fields documentation: https://docs.pydantic.dev/latest/concepts/fields/
- Pydantic Validators documentation: https://docs.pydantic.dev/latest/concepts/validators/
- Pydantic Serialization documentation: https://docs.pydantic.dev/latest/concepts/serialization/
- Pydantic Configuration API documentation: https://docs.pydantic.dev/latest/api/config/
- Pydantic Settings documentation: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- Pydantic Migration Guide: https://docs.pydantic.dev/latest/migration/
- FastAPI response model documentation: https://fastapi.tiangolo.com/tutorial/response-model/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The install command used `pip install pydantic>=2.0`, which can be interpreted by shells as output redirection. Changed it to `pip install "pydantic>=2.0"`.
- The basic model example said Pydantic provided built-in email validation while the code used a plain `str` field with a regex pattern. Updated the comment to describe regex validation accurately.
- Several examples used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware `datetime.now(timezone.utc)` usage.
- The model configuration example described `revalidate_instances='always'` as validating assignments. Added `validate_assignment=True` and clarified that `revalidate_instances` applies to model/dataclass instances passed during validation.
- The alias example used `populate_by_name=True`, which is not recommended in Pydantic v2.11+ and is intended to be replaced. Updated it to `validate_by_name=True` and `validate_by_alias=True`.
- The nested settings example showed database values in `.env`, but the nested `DatabaseSettings` and `RedisSettings` classes did not load `.env` themselves. Added `env_file`, `env_file_encoding`, and `extra='ignore'` to those nested settings classes.
- The FastAPI example used `ConfigDict` without importing it. Added the missing import.
- The serialization example formatted `Decimal` values with dollar signs and dates in a human-readable format, then attempted to parse that JSON back into the same model. Pydantic cannot parse those formatted values back into `Decimal` and `date` fields. Updated the custom serializers to emit round-trip-compatible strings.
- The serialization include example referenced a non-existent `total` field. Changed it to include the existing `tax` field.

## Review Notes
The Pydantic-only snippets were syntax-checked and run locally with Pydantic 2.13.4. FastAPI and pydantic-settings were not installed in the local environment, so those snippets were syntax-checked and verified against official documentation.
