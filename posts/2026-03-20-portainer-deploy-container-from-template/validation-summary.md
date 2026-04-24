# Validation Summary: How to Deploy a Container from a Template in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker containers and volumes
- Portainer application templates
- MySQL container deployment

## Sources Consulted
- Portainer Documentation: Templates — https://docs.portainer.io/user/docker/templates
- Portainer Documentation: Application — https://docs.portainer.io/sts/user/docker/templates/application
- Portainer Documentation: Deploy a container — https://docs.portainer.io/sts/user/docker/templates/deploy-container
- Portainer Documentation: Advanced container settings — https://docs.portainer.io/user/docker/containers/advanced
- Portainer Documentation: App template JSON format — https://docs.portainer.io/advanced/app-templates/format
- Portainer Documentation: Build and host your own app templates — https://docs.portainer.io/sts/advanced/app-templates/build
- Portainer Documentation: General settings — https://docs.portainer.io/admin/settings/general
- Portainer official templates repository — https://raw.githubusercontent.com/portainer/templates/v3/templates.json
- Docker Docs: `docker container exec` — https://docs.docker.com/reference/cli/docker/container/exec/
- MySQL 5.7 Reference Manual: More Topics on Deploying MySQL Server with Docker — https://dev.mysql.com/doc/refman/5.7/en/docker-mysql-more-topics.html

## Issues Found
1. **Template type explanation was incomplete.** The post said type `2` is "a stack template", but Portainer's official format distinguishes `2` as a Swarm stack template and `3` as a Compose stack template. Updated the explanation to reflect the documented values.

2. **Portainer navigation labels were outdated.** Current Portainer docs use `Templates > Application` rather than `App Templates` in the left navigation. Updated the walkthrough steps to match the documented UI.

3. **The MySQL template example did not match Portainer's official template catalog.** The post hardcoded `mysql:8` and listed `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD`, but Portainer's official MySQL template currently uses `mysql/mysql-server:5.7` and prompts for `MYSQL_ROOT_PASSWORD` while presetting `MYSQL_ROOT_HOST`. Removed the hardcoded image tag and corrected the environment-variable guidance.

4. **The bind-mount example was reversed.** Updated the volume mapping to show the host path mounted into the container path (`/data/mysql → /var/lib/mysql`), which matches Docker and Portainer volume mapping semantics.

5. **The verification command comment was inaccurate.** `docker exec -it my-mysql mysql -u root -p` opens a MySQL client inside the running container, not from another container. Updated the comment to describe the command correctly.

6. **The template-creation instructions mixed up Portainer features.** The original text described a non-documented `App Templates > Custom Templates > Container` JSON workflow. Replaced it with Portainer's documented app-template workflow: create a JSON template file, host it over HTTP, and configure Portainer to use it through the App Templates URL or `--templates` flag.

## Review Notes
- Portainer's official MySQL template catalog currently points to `mysql/mysql-server:5.7`, which is version-specific and old. Readers should verify the actual image tag in their configured template catalog before deploying.
- UI labels and flows can vary slightly across Portainer releases. The post was updated against the official documentation available on April 24, 2026.
