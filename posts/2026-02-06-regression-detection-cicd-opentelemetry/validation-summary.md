# Validation Summary: How to Use OpenTelemetry for Regression Detection in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP HTTP exporters
- OpenTelemetry HTTP semantic conventions
- Python dataclasses and typing
- NumPy percentile calculations
- pytest with pytest-json-report
- GitHub Actions workflows and GITHUB_TOKEN permissions
- actions/github-script

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python resources documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry semantic conventions concepts: https://opentelemetry.io/docs/concepts/semantic-conventions/
- GitHub Actions workflow syntax and permissions: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub Actions contexts reference: https://docs.github.com/en/actions/learn-github-actions/contexts
- GitHub REST API issue comments documentation: https://docs.github.com/en/rest/issues/comments
- actions/github-script documentation: https://github.com/actions/github-script
- pytest-json-report project documentation: https://pypi.org/project/pytest-json-report/
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python typing documentation: https://docs.python.org/3/library/typing.html
- NumPy percentile documentation: https://numpy.org/doc/stable/reference/generated/numpy.percentile.html

## Issues Found
- The OpenTelemetry example used older HTTP semantic-convention attributes (`http.method`, `http.url`, and `http.status_code`). Updated them to the current stable names (`http.request.method`, `url.full`, and `http.response.status_code`) and updated the metric attribute for method accordingly.
- The OpenTelemetry setup hard-coded the OTLP endpoint while the workflow supplied `OTEL_ENDPOINT`, which is not the standard OpenTelemetry endpoint environment variable. Updated the code and workflow to use `OTEL_EXPORTER_OTLP_ENDPOINT`.
- The regression detector was described as flagging statistically significant regressions, but the implementation uses fixed thresholds rather than statistical tests. Updated the wording to "threshold-based regressions."
- The `regression_detector.py` snippet referenced `TestRunResults` in runtime annotations without importing it and imported unused `Optional`. Added the required import and removed the unused import.
- The `report_generator.py` snippet referenced `List` and `Regression` without importing them. Added the missing imports.
- The baseline manager saved only aggregate percentile values but `RegressionDetector.detect()` expects a `TestRunResults` object containing endpoint latency and status-code samples. Updated the baseline manager to save and load the data shape consumed by the detector.
- The GitHub Actions workflow attempted to comment on pull requests without explicitly granting the `GITHUB_TOKEN` issue-comment permission. Added `contents: read` and `issues: write`.
- The GitHub Actions report step ran on any prior failure and could fail when `regression-report.md` did not exist. Added a `hashFiles()` guard and awaited the `github.rest.issues.createComment()` call.

## Review Notes
- The Python snippets were syntax-checked after edits.
- The GitHub Actions YAML snippet was parsed successfully after edits.
- The post uses illustrative helper scripts such as `make_request`, `scripts/check_regression.py`, and `scripts/update-baseline.sh`; these are reasonable placeholders for a tutorial but would need real implementations in a production repository.
