# Validation Summary: How to Use the Ansible junit Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- ansible.builtin.junit callback
- JUnit XML
- Jenkins Pipeline
- GitLab CI
- GitHub Actions
- Python xml.etree.ElementTree

## Sources Consulted
- Ansible ansible.builtin.junit callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/junit_callback.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible configuration reference for CALLBACKS_ENABLED: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#callbacks-enabled
- Ansible ansible.builtin.junit source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/callback/junit.py
- Ansible ansible.posix.timer callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Jenkins Pipeline/JUnit documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- GitLab CI artifacts reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitHub Marketplace page for EnricoMi/publish-unit-test-result-action: https://github.com/marketplace/actions/publish-test-results
- Python xml.etree.ElementTree documentation: https://docs.python.org/3/library/xml.etree.elementtree.html

## Issues Found
- Replaced deprecated Ansible callback enablement examples using `callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST` with current `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`.
- Removed invalid `[callback_junit]` ansible.cfg option examples. The junit callback's documented options are configured with `JUNIT_*` environment variables.
- Corrected the callback type from notification to aggregate.
- Corrected the generated file description and XML example. The callback writes a playbook-name-plus-timestamp XML file, not one file per host group, and test case names include host, play, and task details.
- Clarified that JUnit records host/task results as test cases rather than bare task names only.
- Corrected the `test_case_prefix` implication by removing it from the basic example; it filters recorded test cases rather than formatting names.
- Updated CI examples to use `ANSIBLE_CALLBACKS_ENABLED`.
- Corrected the `fail_on_change` example to configure output and behavior with environment variables.
- Corrected the combined callbacks example to use `callbacks_enabled` and FQCNs, and noted that `ansible.posix` must be installed for timer/profile callbacks.
- Fixed the Python XML parser example, which used `Element.getparent()`. That method is not available in Python's standard `xml.etree.ElementTree`.

## Review Notes
The post is now accurate for current Ansible documentation. Users running older Ansible releases before ansible-core 2.11 may still encounter legacy `callback_whitelist` examples in old documentation, but the post now targets the current configuration name.
