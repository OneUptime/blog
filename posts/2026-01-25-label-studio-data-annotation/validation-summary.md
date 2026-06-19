# Validation Summary: How to Implement Label Studio for Data Annotation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Label Studio
- Label Studio Python SDK
- Label Studio ML backend
- Docker Compose
- PostgreSQL
- Kubernetes
- Python
- XML labeling configuration

## Sources Consulted
- Label Studio install and quick start documentation: https://labelstud.io/guide/quick_start
- Label Studio command-line start options: https://labelstud.io/guide/start
- Label Studio Docker and database storage documentation: https://labelstud.io/guide/storedata
- Label Studio Python SDK documentation: https://labelstud.io/guide/sdk
- Label Studio SDK API getting started documentation: https://api.labelstud.io/api-reference/introduction/getting-started
- Label Studio SDK create project tutorial: https://api.labelstud.io/tutorials/tutorials/create-a-project.mdx
- Label Studio SDK import tasks tutorial: https://api.labelstud.io/tutorials/tutorials/import-tasks.mdx
- Label Studio SDK export snapshots tutorial: https://api.labelstud.io/tutorials/tutorials/export-and-convert-snapshots.mdx
- Label Studio SDK assign users tutorial: https://api.labelstud.io/tutorials/tutorials/assign-users-to-tasks.mdx
- Label Studio ML backend documentation: https://labelstud.io/guide/ml_create

## Issues Found
- The Python SDK examples used the deprecated pre-1.0 `Client` API (`start_project`, `get_project`, `project.import_tasks`, `project.export_tasks`, `get_project_summary`, and `assign_tasks`). Updated examples to the current SDK v2 `LabelStudio` client and resource methods such as `client.projects.create`, `client.projects.import_tasks`, `client.projects.exports.as_json`, `client.projects.exports.create`, `client.projects.exports.download`, and `client.projects.assignments.assign`.
- The SDK import-from-URL example implied `project.import_tasks('s3://...')` could directly import from S3. Updated it to explain that S3 imports should use connected S3 import storage and sync through Label Studio or the API.
- The export examples did not match current SDK export behavior. Updated JSON export to use `client.projects.exports.as_json()` and added snapshot polling/conversion before downloading CSV and COCO exports.
- The ML backend example used outdated method signatures for `predict` and `fit`. Updated `predict` to accept `context` and updated `fit` to accept `event` and `data`, matching the current ML backend documentation.
- The ML backend run instructions skipped backend scaffolding and used an inaccurate standalone Docker command. Updated the flow to create the backend with `label-studio-ml create`, start it with `label-studio-ml start`, or run the generated Docker Compose setup.
- The team workflow example used unsupported review settings and assignment helpers. Updated it to current SDK task assignment calls and noted that task assignment and review queues are available in Label Studio Enterprise and Starter Cloud.
- The Docker Compose example enabled local file serving with `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/label-studio/files` but did not mount that path. Added a `./files:/label-studio/files` volume.

## Review Notes
- The Python and YAML snippets were syntax-checked after editing.
- Label Studio SDK v2 is current as of this review; SDK versions before 1.0 are deprecated and no longer supported according to the official SDK documentation.
