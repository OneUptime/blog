# Validation Summary: How to Implement GitLab CI Compliance Pipelines

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitLab CI/CD
- GitLab compliance pipelines
- GitLab compliance frameworks
- GitLab protected branches
- GitLab merge request settings

## Sources Consulted
- GitLab Docs: Compliance pipelines (deprecated): https://docs.gitlab.com/user/compliance/compliance_pipelines/
- GitLab Docs: Tutorial: Create a compliance pipeline (deprecated): https://docs.gitlab.com/tutorials/compliance_pipeline/
- GitLab Docs: Compliance frameworks: https://docs.gitlab.com/user/compliance/compliance_frameworks/
- GitLab Docs: Pipeline execution policies: https://docs.gitlab.com/user/application_security/policies/pipeline_execution_policies/
- GitLab Docs: Auto-merge / Pipelines must succeed: https://docs.gitlab.com/user/project/merge_requests/auto_merge/

## Issues Found
- The post described compliance pipelines as a current recommended implementation path. GitLab documentation states compliance pipelines were deprecated in GitLab 17.3, are planned for removal in GitLab 19.0, and pipeline execution policies should be used for new implementations. I added that caveat to the introduction.
- The post said compliance pipelines run even if teams customize their own `.gitlab-ci.yml`. GitLab documentation says the compliance pipeline configuration replaces the labeled project's `.gitlab-ci.yml` by default, unless the compliance pipeline includes the project configuration. I corrected that explanation.
- The UI path in Step 2 was inaccurate. Current GitLab documentation configures compliance pipelines through **Secure → Compliance center → Frameworks** by adding a compliance pipeline configuration path to a compliance framework, then applying that framework to projects. I updated the steps.
- Step 3 attributed "require pipelines to succeed before merging" only to protected branches. GitLab documents this as the **Pipelines must succeed** merge request setting; protected branches still help control target branches. I clarified that both should be used.

## Review Notes
The YAML example is syntactically valid GitLab CI configuration, but it is only a placeholder job that echoes text rather than running GitLab's built-in SAST templates. For a new GitLab rollout, pipeline execution policies are the current recommended enforcement mechanism.
