# Validation Summary: MLRun Ingestion Fails but Notebooks Succeed: Check Error Streams and Nuclio Logs

## Status
validated

## Post Type
Technical troubleshooting guide with Python examples and Kubernetes CLI commands.

## Technologies Covered
- MLRun feature store and serving runtimes
- Storey and pandas ingestion engines
- Nuclio serverless functions and logging
- Iguazio and V3IO streams
- Kubernetes and kubectl
- Python importlib.metadata

## Sources Consulted
- [MLRun feature-store ingestion guide](https://docs.mlrun.org/en/stable/data-prep/ingest-data-fs.html): ingestion modes, preview behavior, engines, Nuclio deployment, and asynchronous errors.
- [MLRun image builds](https://docs.mlrun.org/en/stable/runtimes/image-build.html): dependencies, packaged code, and image configuration.
- [MLRun graph error handling](https://docs.mlrun.org/en/stable/serving/pipelines-error-handling.html): serving specification error_stream setting.
- [MLRun distributed graph example](https://docs.mlrun.org/en/stable/serving/distributed-graph.html): stream credentials, configuration before deployment, and stream consumption.
- [FeatureSet API](https://docs.mlrun.org/en/stable/api/mlrun.feature_store/index.html#mlrun.feature_store.FeatureSet.deploy_ingestion_service): deployment parameters and returned URL/runtime.
- [MLRun platforms API](https://docs.mlrun.org/en/stable/api/mlrun.platforms/index.html): watch_stream arguments.
- [MLRun watcher implementation](https://docs.mlrun.org/en/stable/_modules/mlrun/platforms.html): shard defaults, JSON decoding, polling loop, and interval=0 behavior.
- [MLRun serving server implementation](https://docs.mlrun.org/en/latest/_modules/mlrun/serving/server.html): error-record fields and error-stream publication failure logging.
- [Python importlib.metadata](https://docs.python.org/3/library/importlib.metadata.html): version lookup and PackageNotFoundError.
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/): container selection, time filtering, timestamps, previous logs, and namespace selection.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/): pod listing, labels, and output formats.
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/): field access and array wildcard syntax.
- [Kubernetes logging architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/): container log retention and centralized logging.
- [Iguazio logging and debugging](https://www.iguazio.com/docs/latest-release/cluster-mgmt/logging-n-debugging/): web-shell service-account requirements.
- [Nuclio platform configuration](https://docs.nuclio.io/en/stable/tasks/configuring-a-platform.html#log-sinks-logger): system, function, and per-function log sinks.
- [Author GitHub profile](https://github.com/nawazdhandala): author link destination.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. Referenced documentation pages were accessible and relevant to their associated claims.
- Confirmed that notebook preview, local ingestion, and deployed ingestion exercise distinct execution contexts. Comparing input types, dependencies, graph configuration, and target access is appropriate diagnostic guidance.
- Confirmed that the FeatureSet API documents deploy_ingestion_service() returning both an invocation URL and a deployed runtime distinct from the supplied RunConfig function. The ingestion guide still uses deploy_ingestion_service_v2(); the post correctly directs readers to their installed release's API.
- Confirmed that watch_stream defaults to shard zero, supports the stated seek modes, and polls each configured shard. A zero interval exits after one pass rather than guaranteeing that the backlog has been drained.
- Confirmed the error formatter includes the stated fields, with id and body nested under event. Publication exceptions are logged with the stated search phrase. These implementation details come from the latest documentation and should be checked against the deployed release before writing a parser.
- Confirmed all Kubernetes flags and the container-name JSONPath expression. Previous logs apply to a previous container instance in the same pod; retained centralized logs are needed when pod logs are no longer available.
- Confirmed Iguazio's documented Log Reader requirement and Nuclio's separate logging scopes.
- All three Python blocks passed ast.parse; the Bash block passed bash -n. The snippets contain intentional environment placeholders, and the configuration example requires an existing serving runtime as stated in its comment.
- This was a documentation and static-syntax review. No live MLRun/Nuclio deployment, V3IO stream, storage credentials, or Kubernetes cluster was used for end-to-end execution.
