# Validation Summary: How to Use Ansible set_stats Module for Custom Statistics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.set_stats
- Ansible callback output and play recap custom stats
- Ansible Tower/AWX workflow artifacts and API usage
- Common Ansible modules including apt, package, setup, template, uri, cron, lineinfile, hostname, timezone, service, command, debug, fail, and community.general.ufw

## Sources Consulted
- Ansible set_stats module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_stats_module.html
- Ansible default callback custom stats option: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible set_stats action plugin and stats aggregation behavior from installed ansible-core 2.21.0 source
- AWX API reference: https://docs.ansible.com/projects/awx/en/latest/rest_api/index.html
- AWX OpenAPI schema: https://docs.ansible.com/projects/awx/en/latest/open_api/index.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- community.general.ufw module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The introduction said custom stats are displayed in the playbook summary unconditionally. Updated it to clarify that the default callback displays them in the play recap only when `show_custom_stats` or `ANSIBLE_SHOW_CUSTOM_STATS=true` is enabled.
- The introduction said `set_stats` passes data between playbook runs. Reworded this to "exposing data to downstream workflow jobs" because core `set_stats` stores stats for the current Ansible run, while Tower/AWX can expose them as workflow artifacts.
- The `aggregate: true` comment said it sums across all hosts. Reworded it because official behavior is to aggregate into the existing stat; numeric run-level values from repeated hosts are added, but aggregation is not limited to numeric summing.
- The aggregation section attempted to count updated packages by parsing APT stdout for lines starting with `Inst`, which is not reliable for `ansible.builtin.apt` upgrade output. Changed the example to count hosts where the APT task reported `changed`.
- The aggregation section said Ansible displays aggregated totals in the PLAY RECAP unconditionally. Updated it to include the required custom stats output setting.
- Several comments and descriptions implied unrelated examples directly incorporated `set_stats` even though the snippets did not. Reworded those lines to avoid the inaccurate claim while preserving the examples.

## Review Notes
The YAML snippets parse successfully. Some examples remain illustrative and depend on user-provided variables such as `app_version`, `previous_version`, `monitoring_api_token`, and `deploy_start_time`, plus environment-specific services and package names.
