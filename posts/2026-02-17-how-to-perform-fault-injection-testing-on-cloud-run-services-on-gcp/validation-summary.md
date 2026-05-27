# Validation Summary: How to Perform Fault Injection Testing on Cloud Run Services on GCP

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- Cloud Monitoring
- Python
- Flask
- Node.js
- Express
- node-http-proxy
- Locust
- Fault injection and chaos engineering practices

## Sources Consulted
- Google Cloud Run rollouts, rollbacks, and traffic migration documentation: https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Google Cloud Run sidecar / multiple container deployment documentation: https://docs.cloud.google.com/run/docs/deploying
- Google Cloud Monitoring Cloud Run metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5/
- Express routing guide: https://expressjs.com/en/guide/routing.html
- Locust configuration documentation: https://docs.locust.io/en/latest/configuration.html
- Flask documentation: https://flask.palletsprojects.com/

## Issues Found
- The Node.js proxy example used `app.all("*", ...)`. Express 5 changed path matching syntax, and a bare `*` wildcard is no longer valid. Changed the handler to `app.use((req, res) => ...)`, which matches all methods and paths without relying on wildcard route syntax.
- The proxy section described dependency failures broadly, including databases and caches, while the sample `http-proxy` code only works for HTTP upstreams. Clarified that the example is for HTTP dependencies and that databases, caches, and other non-HTTP protocols need protocol-specific proxies or test doubles. Also changed the default `TARGET_URL` from a database-like endpoint to an HTTP upstream.
- The monitoring command was labeled as watching Cloud Run metrics in real time, but `gcloud run services describe` only inspects service configuration/status, including traffic split. Updated the comment to describe the command accurately.

## Review Notes
- The Cloud Run traffic splitting examples use documented `--no-traffic`, `--tag`, `--to-tags`, and `--to-latest` flags.
- The Cloud Run container port usage in the Flask example follows the runtime contract by listening on `0.0.0.0` and using the `PORT` environment variable.
- Local validation performed: both Python code blocks compile with Python 3, and the JavaScript proxy snippet passes Node.js syntax checking.
