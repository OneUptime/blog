# Validation Summary: How to Set Up Deployment Approvals in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab protected environments
- GitLab deployment approvals
- GitLab CI YAML
- Manual jobs and blocking pipeline gates
- Deployment freeze windows
- Slack webhook notifications
- Shell scripting in CI jobs
- npm commands used in CI examples

## Sources Consulted
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab deployment approvals documentation: https://docs.gitlab.com/ci/environments/deployment_approvals/
- GitLab protected environments documentation: https://docs.gitlab.com/ci/environments/protected_environments/
- GitLab job control and manual job documentation: https://docs.gitlab.com/ci/jobs/job_control/
- GitLab environments documentation: https://docs.gitlab.com/ci/environments/
- GitLab deployment safety and deploy freeze documentation: https://docs.gitlab.com/ci/environments/deployment_safety/
- GitLab predefined CI/CD variables reference: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab CI/CD rules documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab pipeline timeout settings documentation: https://docs.gitlab.com/ci/pipelines/settings/
- GitLab dotenv artifact reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/

## Issues Found
- The deployment approval flow diagram showed deployment happening before protected environment approval checks. Updated it so the deployment is requested, protected environment approvals are checked, and deployment runs only after required approvals.
- The protected environments explanation implied all multiple-approver behavior was part of basic protected deploy access. Clarified that deployment approvals for protected environments are a GitLab Premium/Ultimate feature.
- The multiple approvers section implied the YAML-only sequential manual jobs enforce separate human approvers. Clarified that true multi-person approval should use protected environment approval rules, while the YAML example models sequential manual checkpoints.
- The approval timeout section incorrectly stated that an untriggered manual job would fail after the configured timeout. Corrected it to explain that `timeout` limits job runtime after the manual job starts, not how long the job can wait to be triggered.
- The deployment windows section said the example used scheduled pipelines, but the snippet enforces a runtime validation check. Updated the wording to match the code.
- The deployment freeze example used custom date comparisons and `rules:variables` in a way that would not reliably create an emergency override path for the deployment. Replaced it with a GitLab deploy-freeze-aware example using `$CI_DEPLOY_FREEZE`, with normal deployment excluded during a freeze and a separate manual emergency deployment path.
- The rollback example used `allow_failure: true` on the approval job, which made the approval optional rather than required. Changed it to `allow_failure: false`.
- The rollback example used `environment: action: stop`, which marks an environment stop action rather than a rollback deployment. Removed the stop action from the rollback job.

## Review Notes
Some snippets are partial examples and assume surrounding project configuration, scripts, environment protection settings, CI/CD variables, and runner shell behavior. For production use, teams should validate the final `.gitlab-ci.yml` in GitLab CI Lint and configure protected environment approvers in the GitLab UI or API.
