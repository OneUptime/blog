# Validation Summary: How to Manage Artifacts in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab job artifacts
- GitLab artifact reports
- GitLab Job Artifacts API
- Semgrep
- Trivy
- ESLint GitLab Code Quality formatter
- AWS S3
- Docker
- YAML

## Sources Consulted
- GitLab Docs: Job artifacts - https://docs.gitlab.com/ci/jobs/job_artifacts/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: CI/CD artifacts reports types - https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab Docs: Job Artifacts API - https://docs.gitlab.com/api/job_artifacts/
- GitLab Docs: CI/CD job token authentication - https://docs.gitlab.com/ci/jobs/ci_job_token/
- GitLab Docs: Code Quality - https://docs.gitlab.com/ci/testing/code_quality/
- GitLab Docs: Container Scanning - https://docs.gitlab.com/user/application_security/container_scanning/
- Semgrep Docs: CLI reference - https://docs.semgrep.dev/cli-reference
- Trivy Docs: GitLab CI integration - https://trivy.dev/docs/latest/tutorials/integrations/gitlab-ci/
- Trivy Docs: Reporting - https://trivy.dev/docs/v0.59/configuration/reporting/

## Issues Found
- The coverage regex used a capturing group. GitLab's current `coverage` keyword documentation says regex groups must be non-capturing because GitLab uses RE2. Changed the regex to match the coverage number without a capturing group.
- The Semgrep SAST example wrote Semgrep's generic JSON output but declared it as a GitLab SAST report. Changed the command to write GitLab SAST format with `--gitlab-sast-output`.
- The Trivy dependency scanning example wrote Trivy's generic JSON output but declared it as a GitLab dependency scanning report. Changed it to a Trivy container scanning example that generates a GitLab container scanning report with Trivy's GitLab template.
- The artifact exclusion example used `dist/test/`, but `artifacts:exclude` paths are not searched recursively. Changed it to `dist/test/**/*` so files under the directory are excluded.
- The S3 reference artifact example uploaded `build-location.txt` without creating it. Added a command to write the S3 location to that file before artifact upload.
- The cleanup API example used a non-existent `DELETE /projects/:id/jobs/artifacts?created_before=...` endpoint. Changed it to GitLab's documented `DELETE /projects/:id/artifacts` endpoint for deleting all artifacts eligible for deletion.
- The cleanup section referred to project-level artifact expiration settings. GitLab documents `expire_in` per job and default artifact expiration as an instance-level setting, so the wording was corrected.
- The named artifact example used `CI_COMMIT_REF_NAME`, which can include slashes. Changed it to `CI_COMMIT_REF_SLUG` to produce safer artifact archive names.

## Review Notes
The examples are intentionally generic and still require the referenced tools, credentials, runner images, and project variables to be available in the user's GitLab CI environment. GitLab security report features such as dependency scanning and some dashboard views can depend on GitLab tier and enabled security features.
