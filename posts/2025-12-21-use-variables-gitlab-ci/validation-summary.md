# Validation Summary: How to Use Variables in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab CI/CD variables
- GitLab CI/CD YAML configuration
- Dotenv report artifacts
- GitLab downstream and trigger pipelines
- Shell variable expansion
- Kubernetes and Docker command usage in CI examples

## Sources Consulted
- GitLab Docs: CI/CD variables - https://docs.gitlab.com/ci/variables/
- GitLab Docs: Predefined CI/CD variables reference - https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Docs: Pass dotenv variables to specific jobs - https://docs.gitlab.com/ci/variables/dotenv_variables/
- GitLab Docs: Use CI/CD variables in job scripts - https://docs.gitlab.com/ci/variables/job_scripts/
- GitLab Docs: Where variables can be used - https://docs.gitlab.com/ci/variables/where_variables_can_be_used/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Downstream pipelines - https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Docs: Specify when jobs run with rules - https://docs.gitlab.com/ci/jobs/job_rules/

## Issues Found
- The variable precedence diagram was outdated and incorrectly placed job and YAML variables above project, group, instance, and dotenv variables. Updated it to match GitLab's current documented precedence order, including policy variables, pipeline variables, project/group/instance variables, dotenv variables, job variables, default YAML variables, deployment variables, and predefined variables.
- The `CI_COMMIT_BRANCH` description was too broad. Updated it to clarify that it is the branch name in branch pipelines, because GitLab does not make it available in merge request or tag pipelines.
- The project variable options section said expanded variables allow variable references but omitted the current GitLab restriction that masked or hidden variables cannot use variable expansion. Added that caveat.
- The nested variable expansion section said to use double dollar signs for complex expansion, but the example actually used shell indirection. Updated the wording and changed the example to use an explicit uppercase selector so it resolves the uppercase `STAGING_URL` / `PRODUCTION_URL` variables correctly.

## Review Notes
- The dotenv artifact example is technically correct for passing generated variables to later jobs. GitLab notes that dotenv variables should not contain secrets because pipeline users can access dotenv report contents.
- GitLab 17.7 and later recommend pipeline inputs over pipeline variables for some downstream/manual pipeline configuration use cases, but the post's trigger-variable example remains valid.
- No syntax issues were found in the remaining GitLab CI YAML examples.
