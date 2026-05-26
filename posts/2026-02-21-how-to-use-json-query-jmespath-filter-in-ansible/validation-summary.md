# Validation Summary: How to Use json_query (JMESPath) Filter in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.general collection
- community.general.json_query filter
- JMESPath
- JSON/YAML data querying
- Python jmespath library

## Sources Consulted
- Ansible community.general.json_query filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/json_query_filter.html
- Ansible community.general JSON query filter guide: https://docs.ansible.com/projects/ansible/latest/collections/community/general/docsite/filter_guide_selecting_json_data.html
- JMESPath specification: https://jmespath.org/specification.html
- JMESPath examples: https://jmespath.org/examples.html
- jmespath package on PyPI: https://pypi.org/project/jmespath/

## Issues Found
- The post used the short `json_query` filter name throughout. Current Ansible documentation identifies the filter as `community.general.json_query`, notes that it is part of the `community.general` collection, and states that it is not included in `ansible-core`. I updated the prose, diagram label, examples, and summary to use `community.general.json_query`.
- The prerequisites only mentioned installing the `jmespath` Python library. Current Ansible documentation also requires the `community.general` collection for the filter, so I added `ansible-galaxy collection install community.general` to the installation snippet.

## Review Notes
The JMESPath expressions in the examples were validated with the Python `jmespath` package and produced the expected results. The local workspace does not have `ansible` or `ansible-galaxy` installed, so full playbook execution could not be performed here.
