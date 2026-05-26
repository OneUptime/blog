# Validation Summary: How to Search for Ansible Galaxy Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible Galaxy roles
- Ansible collections
- Ansible Galaxy CLI
- Ansible Galaxy API
- Python requests
- curl

## Sources Consulted
- Ansible Community Documentation: Galaxy User Guide - https://docs.ansible.com/ansible/latest/galaxy/user_guide.html
- Ansible Community Documentation: ansible-galaxy CLI reference - https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Galaxy NG API v3 documentation - https://ansible.readthedocs.io/projects/galaxy-ng/en/latest/community/api_v3.html
- Live Ansible Galaxy OpenAPI schema - https://galaxy.ansible.com/api/v3/openapi.json
- Live Ansible Galaxy v1 role search endpoint - https://galaxy.ansible.com/api/v1/search/roles/
- Live Ansible Galaxy v3 collection search endpoint - https://galaxy.ansible.com/api/v3/plugin/ansible/search/collection-versions/
- ansible-core 2.21.0 CLI help output for `ansible-galaxy role search`, `ansible-galaxy role info`, and `ansible-galaxy collection`

## Issues Found
- The direct Galaxy API role search examples used `search=postgresql`, which the live v1 role search endpoint does not use for role keyword searching. Changed the examples and Python script to use `autocomplete=postgresql`, matching current `ansible-galaxy` CLI behavior and the live endpoint.
- The API filtering example claimed to filter by platform using `platforms=Ubuntu`. The live OpenAPI schema for `/api/v1/search/roles/` does not document a platform query parameter, and live requests did not narrow results. Changed the example to demonstrate a tag filter only.
- The web UI description referenced star ratings and broad browsing categories that are not reflected in current official documentation. Reworded that section to describe metadata, content type, keyword, tag, and namespace filtering.
- The collections section described `ansible-galaxy collection list` as a collection search command. Current CLI help shows no `ansible-galaxy collection search` subcommand; `collection list` lists installed local collections. Reworded the section and command comment accordingly.
- The tag-filter CLI example had no keyword, which can return the full role index on current public Galaxy. Added the `nginx` keyword so the example remains a bounded search with tag filters.

## Review Notes
- Current `ansible-galaxy` documentation uses explicit role subcommands such as `ansible-galaxy role search` and `ansible-galaxy role info`. ansible-core 2.21.0 still accepts the top-level shortcuts used in the post, so the examples remain functional, but using the explicit `role` form would be clearer in a future refresh.
- The Galaxy v1 role API is still live, but it is legacy. The collection search API uses the v3 endpoint shown in the post.
