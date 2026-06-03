# Validation Summary: How to Build Production Traffic Replay Testing Pipelines Against K8s Staging

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments and Jobs
- Envoy HTTP connection manager, Lua filter, and access logging
- Kafka producer usage with kafka-python
- AWS CLI S3 upload commands
- Bash archiving commands
- Go net/http replay client
- Python result comparison logic
- GitHub Actions CI/CD workflow

## Sources Consulted
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto.html
- Envoy access logging documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy version and installation documentation: https://www.envoyproxy.io/docs/envoy/latest/version_history/version_history and https://www.envoyproxy.io/docs/envoy/latest/start/install
- Kubernetes container command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- kubectl create job reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- Python datetime documentation and Python 3.12 deprecations: https://docs.python.org/3/library/datetime.html and https://docs.python.org/3/whatsnew/3.12.html
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/2.2.13/apidoc/KafkaProducer.html
- AWS CLI s3 cp command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- Go net/http package documentation: https://pkg.go.dev/net/http
- Go os package documentation: https://pkg.go.dev/os
- GitHub actions/checkout documentation: https://github.com/actions/checkout
- GitHub actions/upload-artifact documentation: https://github.com/marketplace/actions/upload-a-build-artifact
- GitHub artifact action v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/

## Issues Found
- The Envoy Lua filter used the deprecated `inline_code` field. Updated it to `default_source_code.inline_string`, which is the current Lua v3 API field.
- The Envoy Lua snippet called `request_handle:body()` without `always_wrap_body`, which can fail for empty request bodies. Updated it to `request_handle:body(true)` so the buffer object is always returned.
- The Envoy container image referenced the old `envoyproxy/envoy:v1.25.0` tag. Updated it to `envoyproxy/envoy:v1.38.0`, the current stable release at validation time.
- The Python capture snippet used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated it to `datetime.now(timezone.utc)` and removed the unused `gzip` import.
- The Go replay engine used `os.Open` but did not import `os`, so the snippet would not compile. Added the missing import.
- The Python result comparison report calculated `total_requests` as the number of issues, not the number of compared requests. Added a counter that increments on each comparison and reports that value.
- The GitHub Actions workflow used stale action versions. Updated `actions/checkout@v3` to `actions/checkout@v6` and `actions/upload-artifact@v3` to `actions/upload-artifact@v7`; `upload-artifact@v3` is no longer usable on GitHub.com after January 30, 2025.
- The workflow used `python analyze-replay.py`; updated it to `python3 analyze-replay.py` for current Ubuntu runner compatibility.

## Review Notes
Python snippets were syntax-checked locally with `python3 -m py_compile`. The local environment did not have `go` or `kubectl` installed, so Go and kubectl examples were verified against official documentation rather than by local execution. The Kubernetes Job example remains illustrative; with `completions: 1`, setting `parallelism: 5` does not create five completed replay pods.
