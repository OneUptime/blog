# Validation Summary: How to Use Ansible with Semaphore UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Semaphore UI
- Ansible
- Docker Compose
- PostgreSQL
- SQLite
- Semaphore REST API
- Nginx reverse proxy
- GitHub Actions
- Cron scheduling

## Sources Consulted
- Semaphore UI Docker installation documentation: https://semaphoreui.com/docs/admin-guide/installation/docker
- Semaphore UI configuration documentation: https://semaphoreui.com/docs/admin-guide/configuration
- Semaphore UI binary installation documentation: https://semaphoreui.com/docs/admin-guide/installation/binary-file
- Semaphore UI API documentation: https://semaphoreui.com/docs/admin-guide/api
- Semaphore UI OpenAPI specification: https://raw.githubusercontent.com/semaphoreui/semaphore/refs/heads/develop/api-docs.yml
- Semaphore UI Key Store documentation: https://semaphoreui.com/docs/user-guide/key-store
- Semaphore UI Inventory documentation: https://semaphoreui.com/docs/user-guide/inventory
- Semaphore UI Variable Groups documentation: https://semaphoreui.com/docs/user-guide/environment
- Semaphore UI Task Templates / Ansible documentation: https://semaphoreui.com/docs/user-guide/task-templates/apps/ansible
- Semaphore UI Schedules documentation: https://semaphoreui.com/docs/user-guide/schedules
- Semaphore UI Integrations documentation: https://semaphoreui.com/docs/user-guide/integrations
- Semaphore UI GitHub releases: https://github.com/semaphoreui/semaphore/releases

## Issues Found
- The simple Docker Compose example used the deprecated `bolt` database dialect. Updated it to use `sqlite` with a persistent SQLite database path, matching current Semaphore UI documentation for lightweight installs.
- The access key encryption placeholders implied a fixed 32-character string. Updated the examples to note the documented generation command, `head -c32 /dev/urandom | base64`.
- The binary installation example pinned Semaphore UI `v2.9.0`, which is outdated. Updated the package URL and install command to the current GitHub release checked during validation, `v2.18.4`.
- The post described a Semaphore project as mapping to one Ansible repository. Updated this to describe projects as workspaces for one or more automation repositories.
- The UI setup flow referred to "Environment" where current documentation uses "Variable Groups." Updated the section title, instructions, template field, and setup diagram.
- The scheduling instructions said to edit a task template and use its Schedule tab. Updated them to use the documented Schedule tab and "New Schedule" flow.
- The API authentication example expected `/api/auth/login` to return a token. Current docs and OpenAPI show login creates a session and API tokens are created via `/api/user/tokens`; updated the curl example accordingly.
- Clarified the webhook/API trigger wording so the `/api/project/1/tasks` example is described as an API trigger, while integrations cover webhook-style triggers.
- Updated production tips to avoid recommending deprecated BoltDB and to use current SQLite/Variable Groups/API trigger terminology.

## Review Notes
The post is now aligned with current Semaphore UI documentation. The Docker examples still use `semaphoreui/semaphore:latest`; pinning an image tag would be better for production reproducibility, but `latest` is also used in the official Docker documentation and is acceptable for this tutorial.
