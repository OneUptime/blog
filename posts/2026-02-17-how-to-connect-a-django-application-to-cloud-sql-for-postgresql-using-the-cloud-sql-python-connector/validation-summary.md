# Validation Summary: How to Connect a Django App to Cloud SQL for PostgreSQL Using the Cloud SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Cloud SQL Python Connector
- Django
- PostgreSQL
- pg8000
- psycopg2
- SQLAlchemy
- Cloud Run
- Secret Manager
- IAM database authentication
- gcloud CLI

## Sources Consulted
- Cloud SQL language connectors for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres/connect-connectors
- Cloud SQL Python Connector package documentation: https://pypi.org/project/cloud-sql-python-connector/
- Cloud SQL IAM database authentication for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres/iam-logins
- Cloud SQL IAM users and service accounts for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres/add-manage-iam-users
- Cloud SQL connection management and pooling: https://docs.cloud.google.com/sql/docs/postgres/manage-connections
- Cloud SQL quotas and limits: https://docs.cloud.google.com/sql/docs/quotas
- Cloud Run to Cloud SQL for PostgreSQL documentation: https://docs.cloud.google.com/sql/docs/postgres/connect-run
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud run jobs create reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/jobs/create
- Django database settings documentation: https://docs.djangoproject.com/en/5.2/ref/settings/#databases
- Django PostgreSQL backend documentation: https://docs.djangoproject.com/en/5.2/ref/databases/#postgresql-notes

## Issues Found
- The post implied the Cloud SQL Python Connector can be wired into Django's built-in PostgreSQL backend through `DATABASES['default']['OPTIONS']`. Updated the text and example to state that Django's native backend does not accept a `pg8000` connector creator directly, and that Django's ORM needs a compatible Django backend, Cloud SQL socket/proxy/direct connection, or a custom backend.
- The installation notes said psycopg2 could be used with the connector. Corrected this to say the connector supports `pg8000` and `asyncpg` for PostgreSQL, while Django's PostgreSQL backend requires `psycopg` or `psycopg2`.
- The post described IAM database authentication as the default passwordless behavior. Clarified the distinction between Cloud SQL IAM authorization and optional IAM database authentication, and added the required `roles/cloudsql.instanceUser` role for IAM database login.
- The SQLAlchemy connector example used the default connector refresh behavior. Updated it to `Connector(refresh_strategy="LAZY")`, matching Google's serverless guidance.
- The Dockerfile ran migrations in the application startup command while the post later recommended running migrations separately. Removed migrations from the startup command.
- The Cloud Run deployment referenced a secret before showing how to create and grant access to it. Moved the Secret Manager steps before the deploy command.
- The Cloud Run deployment used an environment variable for the connector path but the corrected Django ORM example uses the Cloud SQL Unix socket. Updated the deploy command to use `USE_CLOUD_SQL_SOCKET=true` and `--add-cloudsql-instances`.
- The migration job used `--command="python,manage.py,migrate"`, which incorrectly puts the command and arguments together. Updated it to `--command=python` with `--args=manage.py,migrate`, and added `--set-cloudsql-instances`.
- The post stated a fixed connection limit for `db-custom-2-8192`. Replaced it with guidance to check the instance's actual PostgreSQL `max_connections` value.
- Added a note that private IP from Cloud Run requires Cloud Run networking with a VPC path to the Cloud SQL instance.

## Review Notes
The post is technically valid after correction, but its title still reads as if it is missing the final phrase "Python Connector." Future editorial cleanup could also split Django ORM socket/proxy guidance from SQLAlchemy connector guidance into separate sections for clarity.
