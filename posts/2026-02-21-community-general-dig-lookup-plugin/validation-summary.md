# Validation Summary: How to Use the community.general.dig Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.general collection
- community.general.dig lookup plugin
- DNS record lookups
- dnspython
- Jinja2 templating in Ansible playbooks

## Sources Consulted
- Ansible Community Documentation: community.general.dig lookup plugin - https://docs.ansible.com/projects/ansible/latest/collections/community/general/dig_lookup.html
- Ansible Community Documentation: community.general collection installation notes - https://docs.ansible.com/projects/ansible/latest/collections/community/general/dig_lookup.html
- dnspython project site - https://www.dnspython.org/

## Issues Found
- The post described the plugin as the `dig` command wrapped as an Ansible lookup. The official documentation states that `community.general.dig` queries DNS using the `dnspython` Python library, so the wording was corrected.
- The post claimed the lookup supports all standard DNS record types. The official documentation lists supported `qtype` choices and notes that the plugin supports what `dnspython` supports out of the box, with limitations for dictionary conversion. The wording was narrowed to common supported record types.
- The "Using a Specific DNS Server" examples used a nonexistent `dns_servers` keyword parameter. The official plugin syntax uses an `@DNS_SERVER` positional argument, so those examples were updated.
- The HAProxy template example used `notify: reload haproxy` without defining the handler. A minimal handler was added so the playbook is complete.
- The email DNS verification example used `default('NOT FOUND')` in places where empty lookup results would not be replaced. The example now uses `real_empty=True` and `default('NOT FOUND', true)` where appropriate.
- The certificate pre-validation CNAME check treated any result other than `NXDOMAIN` as success, which could pass on an empty no-answer result. The condition now uses `real_empty=True` and checks that the CNAME lookup result has content.
- The caching and error-handling tips were tightened to match documented plugin behavior, including default empty string or `NXDOMAIN` results and the `real_empty` / `fail_on_error` options.
- The performance tip suggested using the `command` module to run `dig` directly for large-scale DNS operations. This was changed to recommend `query('community.general.dig', ...)`, which is the documented Ansible pattern for list results and iteration.

## Review Notes
The examples are technically valid as illustrative playbook snippets, but domains and expected DNS values should be replaced with real infrastructure values before use.
