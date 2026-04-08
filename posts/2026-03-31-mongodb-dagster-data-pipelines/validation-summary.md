# Validation Summary: How to Use MongoDB with Dagster for Data Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dagster (data orchestration platform)
- MongoDB (via PyMongo driver)
- Python

## Sources Consulted
- Dagster official documentation — https://docs.dagster.io/
- Dagster API reference for `@resource`, `@asset`, `@op`, `@job`, `Definitions`, `ScheduleDefinition`, `build_asset_context`, `AssetExecutionContext`, `Out` — https://docs.dagster.io/_apidocs
- PyMongo official documentation — https://pymongo.readthedocs.io/
- Dagster CLI reference (`dagster dev`) — https://docs.dagster.io/getting-started/install

## Issues Found
No technical issues found.

## Review Notes
- The post uses Dagster's legacy `@resource` decorator and `.configured()` pattern rather than the newer `ConfigurableResource` class-based API introduced in Dagster 1.3+. Both are valid; the legacy API is not deprecated and continues to work. Future readers may prefer the newer pattern for new projects.
- The `required_resource_keys` pattern for accessing resources is the legacy approach. The modern alternative uses `Annotated` type hints with `ResourceParam`. Again, both work correctly.
- All PyMongo calls (`find`, `insert_many`, `insert_one`) are used correctly with proper projection syntax.
- The `dagster dev` default port (3000) and `-m` module flag are accurate.
- The testing example using `build_asset_context` with mock resources is a valid and idiomatic approach.
