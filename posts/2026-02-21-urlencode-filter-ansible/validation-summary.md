# Validation Summary: How to Use the urlencode Filter in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2 templates and filters
- URL percent-encoding
- YAML playbook snippets
- Ansible `ansible.builtin.uri` and `ansible.builtin.get_url` modules

## Sources Consulted
- Ansible `ansible.builtin.urlencode` filter documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/urlencode_filter.html
- Jinja `urlencode` filter documentation: https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.urlencode
- Python `urllib.parse` URL quoting documentation: https://docs.python.org/3/library/urllib.parse.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.get_url` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/get_url_module.html
- YAML folded scalar behavior, YAML 1.2 specification: https://yaml.org/spec/1.2.2/

## Issues Found
- The dictionary query string example manually encoded only values and left parameter names unencoded. Changed it to use Jinja's documented mapping support with `{{ api_params | urlencode }}`, which encodes both keys and values and joins them as a query string.
- Folded YAML URL scalars in the webhook and AWX examples would insert spaces into the generated URLs. Changed those examples to single-line URL strings.
- The file path section did not mention that Jinja leaves `/` unquoted for string input. Added that clarification so the example's path separator behavior matches the documented filter behavior.
- The credential example implied that `urlencode` alone encodes `/` in a password. Updated it to use `urlencode | replace('/', '%2F')`, matching Jinja's documented guidance when quoted slashes are required.
- The common character table incorrectly listed `/` as encoded to `%2F` by default. Changed the row to say `/` is not encoded by default.

## Review Notes
Jinja's `urlencode` behaves differently for string input and mapping input: strings use `urllib.parse.quote()` and encode spaces as `%20`, while mappings use `urllib.parse.urlencode()` and typically encode spaces as `+`. The post is technically correct after the fixes, but future revisions could mention this distinction explicitly.
