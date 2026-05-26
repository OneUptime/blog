# Validation Summary: How to Use Ansible junit Callback for CI Test Reports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- Ansible JUnit callback
- JUnit XML reports
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- Azure DevOps Pipelines

## Sources Consulted
- Ansible `ansible.builtin.junit` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/junit_callback.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible `ansible.builtin.default` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible `junit` callback source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/callback/junit.py
- Ansible JUnit XML utility source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/utils/_junit_xml.py
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- `dorny/test-reporter` action README: https://github.com/dorny/test-reporter
- GitLab CI `artifacts:reports:junit` documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- Jenkins JUnit plugin documentation: https://plugins.jenkins.io/junit/
- Azure DevOps `PublishTestResults@2` documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-test-results-v2

## Issues Found
- The post showed JUnit callback options under `[callback_junit]` in `ansible.cfg`. The current Ansible documentation and callback implementation expose those options through `JUNIT_*` environment variables, so the configuration examples were changed to use environment variables for `JUNIT_OUTPUT_DIR`, `JUNIT_TASK_CLASS`, `JUNIT_FAIL_ON_CHANGE`, and `JUNIT_INCLUDE_SETUP_TASKS_IN_REPORT`.
- The environment variable `ANSIBLE_CALLBACK_PLUGINS=junit` was incorrect because `ANSIBLE_CALLBACK_PLUGINS` configures callback plugin search paths, not enabled plugin names. It was removed, leaving `ANSIBLE_CALLBACKS_ENABLED=junit`.
- The post said each host becomes a test suite and showed per-host XML files. The current callback creates one test suite per playbook run and writes files named from the playbook plus a timestamp, with host/task results represented as test cases. The mapping, generated file example, and XML example were corrected.
- The XML example did not match the current callback output closely enough. It was updated to show playbook-level suite naming, host/play/task testcase names, `system-out` for successful tasks, and skipped text content.
- The GitHub Actions examples used `dorny/test-reporter@v1`. The action's current README documents `@v3`, so both examples were updated.
- CI examples pinned `ansible==8.7.0`, which is old for a current guide and not required by the examples. The install commands were changed to `pip install ansible`.
- The combined callbacks example used `stdout_callback = yaml`. The `community.general.yaml` callback is deprecated in favor of the default callback with `callback_result_format = yaml`, so the example was updated.
- The idempotency example used an `ansible.cfg` snippet for `fail_on_change`. It was changed to use the supported `JUNIT_FAIL_ON_CHANGE=true` environment variable.
- The custom test names section said the task name alone becomes the testcase name. The current callback includes host, play, and task name, so that sentence was corrected.
- The Jenkins section described the JUnit plugin as built in. It was changed to refer to the Jenkins JUnit plugin without implying it is always bundled.

## Review Notes
The post is technically relevant and salvageable. Some CI examples still omit production hardening details such as SSH known hosts management and package version pinning, but those are outside the scope of the article's JUnit callback mechanics.
