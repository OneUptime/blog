# Validation Summary: How to Create Deployment Frequency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DORA deployment frequency metrics
- GitHub Actions deployment and deployment status webhooks
- Python and Flask
- Kubernetes Deployments and the Kubernetes Python client
- SQLite
- React
- Recharts
- Docker Compose

## Sources Consulted
- DORA metrics guide: https://dora.dev/guides/dora-metrics/
- DORA 2021 Accelerate State of DevOps Report: https://dora.dev/research/2021/dora-report/
- GitHub webhook events and payloads documentation: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- GitHub REST deployments documentation: https://docs.github.com/en/rest/deployments/deployments
- GitHub Actions deployment documentation: https://docs.github.com/actions/deployment/about-deployments/deploying-with-github-actions
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- Kubernetes Python client AppsV1Api documentation: https://github.com/kubernetes-client/python/blob/master/kubernetes/docs/AppsV1Api.md
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Recharts documentation: https://recharts.org/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name elements documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- GitHub deployment status validation accepted `completed` and `succeeded`, but GitHub deployment status success is represented as `success`. Updated the valid status list to `['success']`.
- GitHub collector recorded ingestion time with `datetime.utcnow()` instead of the webhook event timestamp and used a Python API deprecated since Python 3.12. Updated it to prefer `deployment_status.created_at` and fall back to timezone-aware UTC time.
- Kubernetes rollout completion could count stale status because it did not compare `status.observed_generation` with `metadata.generation`, and it did not check unavailable replicas. Updated the rollout check to verify the observed generation, desired replica count, ready/available/updated replicas, and zero unavailable replicas.
- Kubernetes deployment extraction used the Deployment object UID as the metric ID, which is stable across rollouts and would overwrite later deployments. Updated the ID to include `metadata.generation`.
- Kubernetes deployment extraction assumed labels were always present. Updated it to handle missing labels safely.
- Frequency trend calculation ignored zero-deployment days because only days with deployments were present in `daily_counts`. Updated the calculation to fill the measured period with zero-count days before computing trends.
- Rolling average calculation ignored the requested API `start_date` and always returned a fixed window based only on `end_date`. Updated the calculator and API call to use the requested time-series period while still querying enough earlier data for the rolling window.
- The DORA classifier described elite performance as multiple deployments per day but classified one deployment per day as elite. Updated the elite threshold and displayed benchmark to `>= 2 deployments per day` to match the article's stated category.
- API and alert examples used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated them to use timezone-aware UTC timestamps.
- The `no_deployments_days` alert condition could not detect missing days because zero-deployment days were absent from the dictionary. Updated it to check calendar days explicitly.
- The Docker Compose example used the top-level `version` field, which current Docker Compose treats as obsolete. Removed the field.

## Review Notes
The Python code blocks were syntax-checked after the corrections. The examples remain illustrative and still omit production concerns such as persistent webhook deduplication, database migrations, authentication for the metrics API, retry handling, and full notification handler implementations.
