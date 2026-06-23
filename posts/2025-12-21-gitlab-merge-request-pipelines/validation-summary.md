# Validation Summary: How to Set Up Merge Request Pipelines

## Status
validated

## Post Type
Tutorial / Guide (GitLab CI configuration walkthrough)

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`, `rules`, `workflow:rules`)
- Merge request pipelines, merged results pipelines, and merge trains
- GitLab predefined CI/CD variables
- GitLab Merge Request API (notes endpoint)
- npm (build/test/lint/audit), Node.js tooling
- Bash scripting, git diff, jq, curl

## Sources Consulted
- Predefined CI/CD variables reference — https://docs.gitlab.com/ci/variables/predefined_variables/
- Merge request pipelines — https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/
- Merged results pipelines — https://docs.gitlab.com/ci/pipelines/merged_results_pipelines/
- GitLab Docs: "Pipelines must succeed" merge check (Settings > Merge requests > Merge checks) — confirmed via GitLab documentation/forum references

## Issues Found
1. **Incorrect mechanism for enabling merged results pipelines.** The "Merge Result Pipelines" example set the variable `CI_MERGE_REQUEST_EVENT_TYPE: merged_result` inside `workflow:rules` to "enable merged results pipeline." `CI_MERGE_REQUEST_EVENT_TYPE` is a **read-only** predefined variable (values: `detached`, `merged_result`, `merge_train`) populated by GitLab — it cannot be set in YAML to enable the feature. Merged results pipelines are enabled only via project settings. Removed the bogus `variables` block and clarified the comment.

2. **Non-existent variable names in the merged-results example.** The example referenced `$CI_MERGE_REQUEST_SOURCE_BRANCH` and `$CI_MERGE_REQUEST_TARGET_BRANCH`. These do not exist; the correct predefined variables are `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME` and `CI_MERGE_REQUEST_TARGET_BRANCH_NAME`. Updated the `echo` line accordingly.

3. **Non-existent `CI_MERGE_REQUEST_AUTHOR` variable.** The "Merge Request Specific Variables" example echoed `$CI_MERGE_REQUEST_AUTHOR`, which is not a predefined GitLab variable. Replaced it with the valid `CI_MERGE_REQUEST_ASSIGNEES` variable (keeping the people/MR-metadata intent).

4. **Wrong UI path for enabling merged results pipelines.** Text said "Settings > General > Merge requests." The correct path is "Settings > Merge requests" under "Merge options." Corrected.

5. **Wrong UI path for "Pipelines must succeed."** Text said "Settings > General > Merge requests." The correct path is "Settings > Merge requests" under "Merge checks." Corrected.

## Review Notes
- The remaining YAML examples are syntactically valid and use current GitLab CI keywords (`rules`, `workflow:rules`, `needs`, `artifacts:reports` with `dotenv`/`junit`/`coverage_report`, `environment` with `on_stop`/`action: stop`/`auto_stop_in`, `interruptible`, `allow_failure`, `coverage` regex). All verified against current docs.
- The merge train `workflow:rules` condition `$CI_MERGE_REQUEST_EVENT_TYPE == "merge_train"` is correct usage — reading the read-only variable in a rule condition is valid (distinct from the incorrect attempt to *set* it in issue #1).
- The `report_coverage` job's use of the Merge Request notes API (`$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes`) is accurate.
- Predefined variables used elsewhere (`CI_MERGE_REQUEST_IID`, `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME`, `CI_MERGE_REQUEST_TARGET_BRANCH_NAME`, `CI_MERGE_REQUEST_TITLE`, `CI_COMMIT_BRANCH`, `CI_COMMIT_TAG`, `CI_PIPELINE_SOURCE`, `GITLAB_USER_NAME`) are all valid.
- Minor caveat (not changed, stylistically out of scope): `npm audit --audit-level=high` with `allow_failure: false` will fail the pipeline on any high/critical vulnerability, which can be noisy for transitive deps — a reasonable but opinionated default that authors may want to tune.
