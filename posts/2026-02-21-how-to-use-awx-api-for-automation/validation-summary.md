# Validation Summary: How to Use AWX API for Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX REST API
- Ansible / AWX job templates
- OAuth2 and personal access tokens
- Bash and curl
- Python requests
- API pagination and filtering

## Sources Consulted
- AWX API Reference, Browsable API: https://docs.ansible.com/projects/awx/en/latest/rest_api/browseable.html
- AWX API Reference, Authentication Methods Using the API: https://docs.ansible.com/projects/awx/en/24.6.1/rest_api/authentication.html
- AWX Administration Guide, Token-Based Authentication: https://docs.ansible.com/projects/awx/en/24.6.1/administration/oauth2_token_auth.html
- AWX API Reference, Pagination: https://docs.ansible.com/projects/awx/en/24.6.1/rest_api/pagination.html
- AWX API Reference, Filtering: https://docs.ansible.com/projects/awx/en/latest/rest_api/filtering.html
- AWX User Guide, Job Templates and Extra Variables: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- awx.awx.job_launch module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/job_launch_module.html

## Issues Found
- The authentication section described "session tokens" and "personal access tokens" as separate main API authentication methods. AWX documents session authentication, Basic Authentication, OAuth2 token authentication, and SSO authentication; PATs are an OAuth2 token type. Updated the wording to distinguish browser session cookies from Basic and OAuth2 API authentication.
- The personal access token creation example omitted the documented `description` and `application: null` fields. Updated the example to match the official AWX PAT endpoint example.
- The OAuth2 application token paragraph referred to exchanging client credentials for a token. AWX documents password, implicit, and authorization-code grant types, not a client-credentials grant in this flow. Updated the paragraph to mention supported grant types.
- The job launch section implied any supplied `extra_vars` would be accepted. AWX only honors launch API `extra_vars` when they correspond to an enabled survey or when `ask_variables_on_launch` is true. Added that caveat before the launch example.
- The pagination section stated a fixed default page size of 25. The AWX docs document paginated collection responses, `next`, and the `page_size` query parameter with a configurable maximum limit, but do not present 25 as a guaranteed default page size. Reworded the section to avoid overclaiming.
- The filtering example comment said "last 24 hours" while using a fixed timestamp. Changed the comment to "after a specific timestamp."

## Review Notes
The remaining curl and Python examples are syntactically valid for illustrative use, assuming a reachable AWX host, valid token, existing organization/inventory/job template IDs, and job templates configured to accept any prompted launch fields used in the examples.
