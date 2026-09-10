# Validation Summary: How to Protect CI Runner Artifacts and Caches on Spot Instances

## Status

validated

## Post Type

Tutorial

## Technologies Covered

- GitLab CI and GitLab Runner
- Amazon S3 distributed cache and artifact storage
- Bash
- Python pytest
- EC2 Spot

## Sources Consulted

- [GitLab Runner advanced configuration](https://docs.gitlab.com/runner/configuration/advanced-configuration/)
- [GitLab CI YAML reference](https://docs.gitlab.com/ci/yaml/)
- [AWS CLI S3 copy](https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html)

## Issues Found

No technical issues found.

## Review Notes

- Verified S3 cache fields and credential execution contexts, runner_interrupted availability in GitLab 19.1, retry configuration, and artifact timeout exceptions.
- Executed the extracted Bash script using local pytest and AWS CLI stand-ins. Passing phases exited zero and created COMPLETE; a test failure exited nonzero without COMPLETE; an upload failure stopped execution and produced no success marker.
- YAML and Bash syntax checks passed. No actual GitLab Runner, S3 permissions, distributed cache, or cloud interruption was exercised; the stand-ins tested script control flow only.
