# Validation Summary: How to Set Up ansible-lint in GitLab CI

## Status
validated

## Post Type
Tutorial / CI configuration guide

## Technologies Covered
- Ansible
- ansible-lint
- ansible-galaxy
- yamllint
- GitLab CI/CD
- GitLab Code Quality reports
- GitLab JUnit test reports
- Docker

## Sources Consulted
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- ansible-galaxy CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab CI/CD artifacts report types: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab Code Quality documentation: https://docs.gitlab.com/ci/testing/code_quality/
- GitLab CI/CD caching documentation: https://docs.gitlab.com/ci/caching/
- GitLab job rules documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab merge request pipeline documentation: https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/
- GitLab Docker image usage documentation: https://docs.gitlab.com/ci/docker/using_docker_images/
- GitLab auto-merge and successful pipeline requirement documentation: https://docs.gitlab.com/user/project/merge_requests/auto_merge/
- GitLab CI/CD settings documentation for required pipeline configuration status: https://docs.gitlab.com/administration/settings/continuous_integration/

## Issues Found
- Several standalone GitLab CI examples used `stage: lint` without declaring a `lint` stage. Added `stages: - lint` to the JUnit report, custom image, and changed-files examples so they are valid as standalone `.gitlab-ci.yml` snippets.
- The custom Docker image used `ENTRYPOINT ["ansible-lint"]`, which can prevent GitLab Runner from sending the job script to a shell unless the entrypoint is overridden. Changed it to `CMD ["ansible-lint"]` so the image can still default to ansible-lint outside CI while remaining usable as a GitLab CI job image.
- The changed-files example diffed against `origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME` without ensuring that ref exists in the CI checkout. Added an explicit `git fetch` to populate the target branch remote ref before running `git diff`.
- The Code Quality section implied `artifacts: when: always` is what ensures report artifacts upload on failed jobs. GitLab uploads `artifacts:reports` regardless of job result, so the explanation was corrected.
- The merge request settings section suggested "Required pipeline configuration", which is deprecated/removed or feature-flagged in current GitLab versions. Replaced it with current guidance to use compliance pipelines or pipeline execution policies where available.

## Review Notes
- The ansible-lint `-f codeclimate` usage, GitLab `artifacts:reports:codequality`, JUnit report configuration, cache key based on `collections/requirements.yml`, `rules` using `CI_PIPELINE_SOURCE == "merge_request_event"`, and Ansible collection installation commands are consistent with current official documentation.
- Linting only changed files is technically valid for faster feedback, but teams should still run a full ansible-lint job periodically or on the default branch because cross-file role and playbook relationships can be missed by changed-file-only linting.
