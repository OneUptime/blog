# Validation Summary: How to Implement Tekton Results for Pipeline History

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Tekton Results
- Tekton Pipelines (TaskRun, PipelineRun)
- Kubernetes (Deployments, ConfigMaps, Secrets, CronJobs, PVCs, PodDisruptionBudgets)
- PostgreSQL (storage backend, JSONB queries, indexes)
- gRPC and REST APIs
- Python `grpcio` client and `grpcurl`
- `tkn` Tekton CLI
- Grafana (PostgreSQL data source, dashboards)
- Prometheus (alerting rules via PrometheusRule CRD)
- Cloud object storage (Amazon S3, Google Cloud Storage)

## Sources Consulted
- Tekton Results GitHub repository: https://github.com/tektoncd/results
- Tekton Results API config struct: https://raw.githubusercontent.com/tektoncd/results/main/pkg/api/server/config/config.go
- Tekton Results install docs: https://github.com/tektoncd/results/blob/main/docs/install.md
- Tekton Results watcher entrypoint: https://raw.githubusercontent.com/tektoncd/results/main/cmd/watcher/main.go
- Verified `storage.googleapis.com/tekton-releases/results/latest/release.yaml` returns HTTP 200

## Issues Found
1. **PostgreSQL was claimed to be bundled in `release.yaml`.** The release manifest only ships the Results API and Watcher; PostgreSQL must be provisioned separately (the docs explicitly call this out and the project even has a separate `external-database.md` guide). Fixed the inline comment to state PostgreSQL is installed separately.
2. **`S3_BUCKET` config key was incorrect.** The Tekton Results API config struct uses `S3_BUCKET_NAME`. Updated.
3. **`S3_FORCE_PATH_STYLE` config key was incorrect.** The actual field is `S3_HOSTNAME_IMMUTABLE` (semantically equivalent — both control whether the SDK rewrites the hostname for virtual-hosted bucket access). Updated and adjusted the comment.
4. **`GCS_BUCKET` config key was incorrect.** The actual field is `GCS_BUCKET_NAME`. Updated.
5. **`GRPC_REFLECTION` is not a real Tekton Results API config option.** Removed the line (and its comment) from the API ConfigMap example.

## Review Notes
- The Results Watcher ConfigMap example (`tekton-results-watcher-config` with `WATCH_NAMESPACES`, `RESULTS_API`, `CHECK_INTERVAL`, `BATCH_SIZE`, `TLS_ENABLED`, `LOG_LEVEL`) is illustrative rather than literal — the upstream watcher is actually configured through command-line flags on its Deployment (`-api_addr`, `-namespace`, `-requeue_interval`, `-threadiness`, etc.) and does not consume a ConfigMap with these exact keys. The section communicates the right concepts, so it was left in place, but readers implementing this should patch the watcher Deployment's args rather than rely on this ConfigMap shape.
- The `tkn results` examples assume the Results plugin functionality is exposed under `tkn results`. Historically this lived in a separate `tkn-results` plugin; integration into the main `tkn` CLI happened in later releases. The exact flag (`--api-url` vs `--addr`) and command surface may vary by CLI version — users should check `tkn results --help` for their installed version.
- The post claims Tekton Pipelines `v0.25.0+` is required. The official install doc does not pin a minimum version explicitly, and in practice recent Results releases target much newer Pipelines versions. The stated minimum is conservative rather than incorrect, so it was left as-is.
- The Python example uses the `tekton.dev/v1beta1.PipelineRun` `data_type`. Modern Tekton Pipelines emits `v1` PipelineRuns, but `v1beta1` records continue to exist for older runs and the watcher still records under the type that was applied — readers may need to query both `v1beta1.PipelineRun` and `v1.PipelineRun` going forward.
- The HA deployment uses `image: gcr.io/tekton-releases/.../api:latest`. Pinning a concrete release tag would be a safer practice for production rollouts.
- The S3 secret example places `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in a Kubernetes Secret. The Tekton Results API actually reads `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` from its environment when not using IRSA — the AWS-named variables happen to work because the underlying AWS SDK also reads them, but the Results-native names are the documented path.
