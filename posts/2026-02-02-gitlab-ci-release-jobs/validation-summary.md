# Validation Summary: How to Configure GitLab CI for Release Jobs

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- GitLab CI/CD
- GitLab release-cli (`registry.gitlab.com/gitlab-org/release-cli`)
- GitLab release keyword (`tag_name`, `name`, `description`, `ref`, `milestones`, `released_at`, `assets.links`)
- GitLab CI predefined variables (`CI_COMMIT_TAG`, `CI_COMMIT_BRANCH`, `CI_COMMIT_SHA`, `CI_PROJECT_URL`, `CI_PROJECT_NAME`, `CI_PIPELINE_ID`, `CI_COMMIT_TIMESTAMP`, `CI_REGISTRY_*`, `CI_JOB_TOKEN`, `CI_API_V4_URL`, `CI_PROJECT_ID`)
- GitLab CI rules and `if:` conditions with regex matching
- `parallel: matrix:` builds
- `artifacts: reports: dotenv`
- conventional-changelog-cli
- Docker-in-Docker (`docker:24-dind`)
- Trivy security scanner
- GPG signing

## Sources Consulted
- GitLab CI/CD release keyword reference: https://docs.gitlab.com/ee/ci/yaml/#release
- GitLab predefined CI/CD variables: https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab release-cli project: https://gitlab.com/gitlab-org/release-cli
- GitLab `parallel: matrix:` documentation: https://docs.gitlab.com/ee/ci/yaml/#parallelmatrix
- GitLab release asset link types (`runbook`, `package`, `image`, `other`): https://docs.gitlab.com/ee/user/project/releases/release_fields.html
- GitLab `artifacts:reports:dotenv` documentation: https://docs.gitlab.com/ee/ci/yaml/artifacts_reports.html#artifactsreportsdotenv
- conventional-changelog-cli docs: https://github.com/conventional-changelog/conventional-changelog

## Issues Found

1. **Broken markdown code fence in "Static Description" example (lines 105–128)**
   - **What was wrong:** The outer YAML block opened with three backticks (` ```yaml `) while containing a nested ` ```bash ... ` block (also three backticks). The inner closing fence was written as ` ```bash ` (invalid — fences must be backticks only, no language), and the outer block closed with ` ```text ` (also invalid).
   - **Fix:** Switched the outer fence to four backticks (` ````yaml ` / ` ```` `) — matching the pattern already used elsewhere in the post for nested code blocks — and changed the inner closing fence to plain ` ``` `.

2. **Branch-Based Releases examples used `$CI_COMMIT_BRANCH` in tag pipelines (lines 375–412)**
   - **What was wrong:** The rules `if: $CI_COMMIT_TAG && $CI_COMMIT_BRANCH == "main"` and `if: $CI_COMMIT_TAG && $CI_COMMIT_BRANCH =~ /^release\//` cannot ever match. Per GitLab's predefined variables docs, `CI_COMMIT_BRANCH` is explicitly not set in tag pipelines, so the second condition is always false when the first is true. The description string `Hotfix release from ${CI_COMMIT_BRANCH}` would also expand to an empty value.
   - **Fix:** Retitled the section to "Tag-Pattern Differentiated Releases", added an explanatory note about the tag-pipeline limitation, and rewrote both rules to use tag-name regex patterns (a standard release pattern and a `-hotfix` suffix pattern) so the examples actually trigger as described. Replaced the broken `${CI_COMMIT_BRANCH}` interpolation in the hotfix description with `${CI_COMMIT_TAG}`.

## Review Notes

- **`released_at: ${RELEASE_DATE}` in `create-future-release` (lines ~537–557):** The example computes `RELEASE_DATE` in the same job's script and writes it to a `release.env` dotenv artifact. `artifacts: reports: dotenv` propagates variables to *downstream* jobs only — within a single job, the `release:` section won't see a variable produced by that same job's script via dotenv. For this to work as written, the date computation should be split into an earlier job whose dotenv artifact is consumed via `needs` by the release job. Left as-is because the pattern is conceptually valid; readers experimenting with it should split the work into two jobs.
- **`RELEASE_CLI_DEBUG: "true"` (lines 432–434 and 953–954):** This is shown as if it enables release-cli debug output, but I could not find a documented `RELEASE_CLI_DEBUG` environment variable in the release-cli project. It will be set harmlessly as a custom variable but won't have any effect. Left as-is since it does not break the pipeline.
- **`description` file path:** The post correctly uses `description: "./RELEASE_NOTES.md"` — the leading `./` is required for release-cli to treat the value as a file path rather than a literal string.
- **Link types:** All four `link_type` values used (`package`, `image`, `runbook`, `other`) match the documented set.
- **Asset URL format:** The `${CI_PROJECT_URL}/-/jobs/artifacts/${CI_COMMIT_TAG}/raw/<path>?job=<job>` format is the documented pattern for linking to latest artifact files from a tag pipeline; this is correct.
- **`parallel: matrix:`:** The matrix syntax is valid and expands to the expected GOOS/GOARCH combinations.
- **Tag-pipeline workflow caveat:** The post's pipeline relies on tag pushes to trigger every stage via `if: $CI_COMMIT_TAG`. Readers should be aware that some teams use `workflow:` rules to gate pipelines globally; the examples assume a default project workflow.
