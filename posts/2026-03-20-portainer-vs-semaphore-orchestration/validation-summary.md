# Validation Summary: Portainer vs Semaphore: Container Orchestration Comparison - Orchestration

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Portainer
- Semaphore UI
- Ansible
- Docker Compose
- MySQL
- Portainer HTTP API

## Sources Consulted
- Semaphore UI Docker installation docs: https://semaphoreui.com/docs/administration-guide/installation/docker
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Semaphore UI configuration reference: https://docs.semaphoreui.com/administration-guide/configuration/
- Semaphore UI official GitHub repository: https://github.com/semaphoreui/semaphore
- Portainer API access docs: https://docs.portainer.io/2.21/api/access
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Ansible `ansible.builtin.uri` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.file` lookup docs: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_lookup.html

## Issues Found
- The Semaphore Docker Compose example targeted MySQL but omitted `SEMAPHORE_DB_DIALECT=mysql`, even though Semaphore documents `sqlite` as the default dialect. I added the documented MySQL connection fields and the required access-key encryption setting so the example matches the current Docker installation guidance.
- The Compose snippet used the top-level `version: "3.8"` field. Docker's current Compose reference marks the `version` element as obsolete, so I removed it to align the example with the current Compose specification.
- The post described Semaphore only as an Ansible UI. Current official Semaphore UI documentation describes it as an automation UI/API used with Ansible and other DevOps tools. I updated the wording to reflect the current product scope without changing the article's comparison.
- The Portainer Ansible example used `PUT /api/stacks/1/file`, a bearer token header, and multipart form data. Portainer's current API docs and OpenAPI spec document stack updates as `PUT /api/stacks/{id}?endpointId=...` with a JSON body, while the API access docs show user access tokens in `X-API-Key`. I corrected the endpoint, header, request body format, and payload field name accordingly.
- The Semaphore example pinned `semaphoreui/semaphore:v2.10.22`, which is behind the current release line. I changed the image reference to `semaphoreui/semaphore:latest` to align with the current official installation docs.

## Review Notes
- Portainer's documentation currently points to the 2.39.1 API reference as the latest LTS API documentation on April 24, 2026.
- The snippets were validated against official documentation and the Portainer OpenAPI specification. `docker` was not available in this workspace, so I did not execute the Compose example locally.
