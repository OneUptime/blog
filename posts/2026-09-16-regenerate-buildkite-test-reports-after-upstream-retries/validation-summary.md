# Validation Summary: How to Regenerate Buildkite Test Reports After Retrying Upstream Jobs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Buildkite Pipelines
- Buildkite Agent artifact and annotation CLIs
- Buildkite Jobs REST API
- YAML
- Bash
- Python 3
- JUnit XML

## Sources Consulted
- [Buildkite dependency behavior](https://buildkite.com/docs/pipelines/configure/depends-on)
- [Buildkite retry configuration](https://buildkite.com/docs/pipelines/configure/retry)
- [Buildkite command step configuration](https://buildkite.com/docs/pipelines/configure/step-types/command-step)
- [Buildkite parallel builds](https://buildkite.com/docs/pipelines/best-practices/parallel-builds)
- [Buildkite Agent artifact CLI](https://buildkite.com/docs/agent/cli/reference/artifact)
- [Buildkite build artifacts guide](https://buildkite.com/docs/guides/artifacts)
- [Buildkite Agent annotate CLI](https://buildkite.com/docs/agent/cli/reference/annotate)
- [Buildkite Annotations API](https://buildkite.com/docs/apis/rest-api/annotations)
- [Buildkite Jobs API](https://buildkite.com/docs/apis/rest-api/jobs)
- [Python `xml.etree.ElementTree` documentation](https://docs.python.org/3/library/xml.etree.elementtree.html)

## Issues Found
No technical issues found.

## Review Notes
The pipeline attributes and CLI options are current. Buildkite excludes superseded retried-job artifacts by default, while `--include-retried-jobs` includes all attempts. Reusing an annotation context without `--append` replaces its body. The Jobs API permits retrying a passed job when `permit_on_passed: true` is configured, creates a new job, and permits each job ID to be retried only once. The Python example is intentionally limited to non-namespaced, conventional JUnit XML, and the post states that limitation.
