# Validation Summary: How to Use AWX Smart Inventories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX Smart Inventories
- AWX REST API v2
- Ansible inventories and cached facts
- AWX schedules and RRULE strings
- curl and JSON API requests

## Sources Consulted
- AWX User Guide: Inventories and Smart Inventories: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/inventories.html
- AWX OpenAPI Reference: https://docs.ansible.com/projects/awx/en/latest/open_api/explorer.html
- awx.awx schedule module documentation: https://docs.ansible.com/ansible/latest/collections/awx/awx/schedule_module.html
- ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/setup_module.html

## Issues Found
- Smart inventories are deprecated in current AWX documentation. Added a note that constructed inventories are recommended for new designs.
- The post implied smart inventory filters query all hosts AWX knows about. Corrected this to hosts in inventories within the same AWX organization.
- Group filters used `group__name`, but AWX documentation shows the related field as `groups__name`. Updated all group filter examples and limitation text.
- Boolean examples used `&` and `|`. AWX smart host filters support `and`, `or`, and grouping with parentheses. Updated AND/OR examples and the Linux servers example.
- Fact filtering was described as filtering Ansible variables generally. Clarified that the examples use cached Ansible facts and noted that fact caching must be enabled for fact-based smart filters.
- The stale-host example compared `last_job` directly to a timestamp. `last_job` is a related job field, so the filter now uses `last_job__finished__lt`.
- The refresh section overstated manual refresh behavior. Updated it to describe view/run-time evaluation, the `smart_inventories` membership table, `AWX_REBUILD_SMART_MEMBERSHIP`, and syncing underlying inventory sources.

## Review Notes
The API endpoint patterns and schedule RRULE format are consistent with the AWX API and awx.awx collection documentation. The post remains useful for existing AWX installations, but future updates should consider a constructed inventory version because smart inventories are deprecated.
