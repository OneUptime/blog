# Validation Summary: How to Use Domain-Driven Design Boundaries When Splitting a Monolith on GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Platform
- Cloud Run
- Pub/Sub
- IAM service accounts and Cloud Run Invoker IAM
- Python static analysis with `ast` and `os.path`
- Domain-Driven Design and bounded contexts
- Microservice data ownership patterns

## Sources Consulted
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK `gcloud pubsub topics create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud Pub/Sub create push subscriptions documentation: https://docs.cloud.google.com/pubsub/docs/create-push-subscription
- Google Cloud Pub/Sub authenticated push subscriptions documentation: https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud SDK `gcloud run services add-iam-policy-binding` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding
- Google Cloud SDK `gcloud iam service-accounts create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud Run VPC connector documentation: https://docs.cloud.google.com/run/docs/configuring/vpc-connectors
- Google Cloud Run Direct VPC egress and connector comparison: https://docs.cloud.google.com/run/docs/configuring/connecting-vpc
- Python `ast` module documentation: https://docs.python.org/3/library/ast.html
- Python `os.path` documentation: https://docs.python.org/3/library/os.path.html
- Martin Fowler on Bounded Context: https://martinfowler.com/bliki/BoundedContext.html
- Microservices.io Database per Service pattern: https://microservices.io/patterns/data/database-per-service.html

## Issues Found
- The dependency-analysis script only handled `from app... import ...` statements and could raise `IndexError` for `from app import catalog`. I updated it to handle both `import app.context` and `from app import context` forms, to skip non-context imports safely, and to use `os.path.relpath` plus `os.sep` for portable module-name derivation.
- The `CatalogAdapter` example used `requests.get(...)` without importing `requests`. I added the missing import so the snippet can run with the `requests` package installed.
- The Pub/Sub push subscription example targeted Cloud Run service URLs after the deployment example made Cloud Run private with `--allow-unauthenticated=false`, but it did not configure authenticated push. I added a Pub/Sub push service account, Cloud Run Invoker bindings for the target services, and `--push-auth-service-account` on both subscriptions.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so CLI validation was performed against current official Google Cloud SDK documentation rather than local `--help` output. The Cloud Run deploy command uses a Serverless VPC Access connector, which remains valid, but Google Cloud now recommends Direct VPC egress for many Cloud Run-to-VPC use cases because it is simpler and avoids connector VM charges.
