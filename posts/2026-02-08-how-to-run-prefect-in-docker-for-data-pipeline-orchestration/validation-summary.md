# Validation Summary: How to Run Prefect in Docker for Data Pipeline Orchestration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Prefect 2
- Python
- PostgreSQL
- Pandas
- SQLAlchemy
- REST APIs
- ETL workflows

## Sources Consulted
- Prefect 2.20 deployment guide: https://docs-2.prefect.io/latest/guides/prefect-deploy/
- Prefect workers documentation: https://docs.prefect.io/v3/concepts/workers
- Prefect process worker SDK reference: https://reference.prefect.io/prefect/workers/process/
- Prefect schedule schema reference: https://reference.prefect.io/prefect/client/schemas/schedules/
- Prefect self-hosted server guide: https://docs.prefect.io/v3/how-to-guides/self-hosted/server-cli
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it because modern Docker Compose validates against the latest Compose Specification and warns when `version` is present.
- The ETL example annotated `extract_data()` and `transform_data()` as using `dict`, but the default JSONPlaceholder users endpoint returns a list of records. Updated the return and parameter type hints to `list`.
- The deployment example used the older `Deployment.build_from_flow()` pattern and imported `CronSchedule` from the server schema module. Replaced it with `etl_pipeline.to_deployment()` and `prefect.client.schemas.schedules.CronSchedule`, matching current Prefect 2 deployment guidance and public client schemas.
- The process worker could run from `/app` while the mounted flow code is under `/app/flows`, making flow module discovery unreliable. Added `job_variables={"working_dir": "/app/flows"}` to the deployment so the process worker runs the flow from the mounted flow directory.

## Review Notes
The post is written for Prefect 2 images (`prefecthq/prefect:2-python3.12`). Prefect 3 is now generally available, so a future update could add an explicit Prefect 2 note or migrate the examples to Prefect 3. Docker Hub rate limits prevented pulling the referenced image locally, but Prefect 2.20.16 APIs were checked with a temporary Python package install and official documentation.
