# Validation Summary: How to Implement Lead Time Tracking

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- DORA software delivery performance metrics
- GitHub webhooks
- GitHub Actions
- FastAPI
- Pydantic
- Python dataclasses and datetime
- Kubernetes kubectl
- React
- Recharts
- PostgreSQL
- Mermaid

## Sources Consulted
- DORA software delivery performance metrics: https://dora.dev/guides/dora-metrics/
- DORA Quick Check / lead time response ranges: https://dora.dev/quickcheck/?v=2025
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub webhook events and payloads: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- FastAPI response model documentation: https://fastapi.tiangolo.com/tutorial/response-model/
- Pydantic model API documentation: https://pydantic.dev/docs/validation/latest/concepts/models/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl/
- PostgreSQL CREATE VIEW documentation: https://www.postgresql.org/docs/current/sql-createview.html
- Recharts documentation: https://recharts.org/

## Issues Found
- The post described lead time as one of "four key DORA metrics" and referenced mean time to recovery. DORA's current public guidance describes a five-metric software delivery performance model and uses failed deployment recovery time, change fail rate, and deployment rework rate. Updated the wording to avoid the outdated four-metric framing.
- The webhook handler stored GitHub deployment status events as `deployment_success`, but the calculator expected `deployment_completed`. Changed the webhook event type to `deployment_completed` so collected data can be calculated.
- The webhook handler used `event.dict()`, which is deprecated in Pydantic v2. Replaced it with `event.model_dump()`.
- The PR merge event was keyed by `merge_commit_sha`, while the PR opened event was keyed by the head SHA. Changed the merged event to use the PR head SHA so the example groups PR lifecycle events consistently.
- The measurement diagram included deploy-start to deploy-complete time, but the GitHub Actions snippet did not emit `deployment_started` and the calculator used build completion as the deploy-start timestamp. Added a `deployment_started` event and updated the calculator to use it.
- The aggregation and bottleneck examples omitted deploy-time aggregation even though deployment was modeled as a phase. Added `mean_deploy_time` and included the deploy phase in bottleneck analysis.
- Several Python snippets referenced types from earlier files without imports. Added imports for `LeadTimeMetrics` and `LeadTimeStatistics` where needed.
- The React dashboard expected camelCase JSON fields, while the FastAPI response model returns snake_case field names by default. Updated the TypeScript interfaces and Recharts `dataKey` values to match the API response.
- Removed unused imports from the FastAPI webhook example.

## Review Notes
- Python snippets compile syntactically with `python3`; runtime execution was not performed because the repo does not include the example FastAPI/Pydantic application dependencies.
- The local environment did not include `kubectl`, so `kubectl apply -f` was verified against Kubernetes official documentation rather than local help output.
- The repo does not include React or Recharts dependencies, so the React component was reviewed for API contract and syntax shape but not locally typechecked.
- Production webhook handling should also verify GitHub webhook signatures before trusting payloads; this is a security hardening note rather than a correctness blocker for the simplified example.
