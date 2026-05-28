# Validation Summary: How to Build a Go REST API with Chi Router and Deploy It to Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Chi router
- net/http
- pgx/pgxpool
- Cloud SQL for PostgreSQL
- Cloud SQL Go connector
- Cloud Run
- Cloud Build
- Artifact Registry
- Docker

## Sources Consulted
- Go chi package documentation: https://pkg.go.dev/github.com/go-chi/chi/v5
- Go chi middleware package documentation: https://pkg.go.dev/github.com/go-chi/chi/v5/middleware
- pgxpool package documentation: https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool
- Cloud SQL Go connector package documentation: https://pkg.go.dev/cloud.google.com/go/cloudsqlconn
- Cloud SQL Go connector PostgreSQL sample: https://docs.cloud.google.com/sql/docs/postgres/samples/cloud-sql-postgres-databasesql-connect-connector
- Cloud SQL for PostgreSQL connection from Cloud Run documentation: https://docs.cloud.google.com/sql/docs/postgres/connect-run
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud artifacts repositories create reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Cloud Build Docker image build documentation: https://docs.cloud.google.com/build/docs/building/build-containers
- Artifact Registry transition from Container Registry documentation: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr

## Issues Found
- The Cloud SQL connection snippet mixed the `cloudsqlconn/postgres/pgxv5` `database/sql` driver registration package with direct `pgxpool` configuration. I removed the unused driver registration dependency and used a `cloudsqlconn.Dialer` directly in `config.ConnConfig.DialFunc`, matching the connector and pgx APIs.
- The Cloud SQL dialer was created inside `DialFunc`, which would create a new dialer for every connection attempt and leave dialers open. I changed the sample to create one dialer per pool, return its cleanup function, and close it on startup errors.
- The router snippet called `context.Background()` without importing `context`. I added the missing import and updated the `connectDB` call site for the cleanup function.
- The deployment commands pushed the application image to `gcr.io/YOUR_PROJECT/chi-api`. Since Container Registry writes are shut down for unmigrated projects and Artifact Registry is the recommended service, I changed the tutorial to create an Artifact Registry Docker repository and use a `us-central1-docker.pkg.dev/...` image URL for Cloud Build and Cloud Run.

## Review Notes
- I could not run local `go` or `gcloud` verification because neither CLI is installed in this environment. API and command validation was performed against official package and Google Cloud documentation.
- The tutorial still stores `DB_PASS` in an environment variable for simplicity. For production, Secret Manager or Cloud Run secrets would be a better follow-up improvement, but the existing pattern is technically valid.
