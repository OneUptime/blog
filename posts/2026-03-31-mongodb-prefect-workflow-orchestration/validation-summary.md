# Validation Summary: How to Use MongoDB with Prefect for Workflow Orchestration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (via PyMongo)
- Prefect (Python workflow orchestration)
- Python

## Sources Consulted
- Prefect 3 upgrade guide: https://docs.prefect.io/v3/resources/upgrade-to-prefect-3
- Prefect migration.py (REMOVED_IN_V3 list): https://github.com/PrefectHQ/prefect/blob/main/src/prefect/_internal/compatibility/migration.py
- Prefect deploy docs (flow.serve): https://docs.prefect.io/v3/deploy/run-flows-in-local-processes
- Prefect tasks API reference: https://docs.prefect.io/v3/api-ref/python/prefect-tasks
- Prefect Blocks / Secrets docs: https://docs.prefect.io/v3/how-to-guides/configuration/store-secrets
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/

## Issues Found
1. **Deprecated Deployment API (Scheduling the Flow section)**: The post used `Deployment.build_from_flow()` with `CronSchedule` from `prefect.server.schemas.schedules`. This API was removed in Prefect 3 and raises `PrefectImportError` on import. Replaced with the current `flow.serve()` method which accepts a `cron` string parameter directly. Updated the surrounding text to reflect that `serve()` creates a deployment and starts a long-lived process to execute scheduled runs.

## Review Notes
- The `@task(retries=3, retry_delay_seconds=10)` and `@task(retries=2)` parameter names are correct for both Prefect 2 and 3.
- `@flow(log_prints=True)` is correct and current.
- `Secret.load("mongo-uri").get()` is the correct pattern; `.get()` unwraps the `SecretStr` wrapper.
- The claim that `retries=3` "automatically retries on transient MongoDB connection errors" is slightly imprecise — Prefect retries on any exception, not only connection errors — but is not technically wrong.
- The `prefect deployment run` CLI command and `prefect server start` are still valid in Prefect 3.
- All PyMongo usage (`MongoClient`, `find`, `insert_many`, `update_one` with `upsert=True`) is correct and current.
