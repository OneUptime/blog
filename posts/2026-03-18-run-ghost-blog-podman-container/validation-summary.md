# Validation Summary: How to Run Ghost Blog in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Ghost CMS
- Docker Official Images
- MySQL
- SQLite
- Ghost configuration environment variables
- Ghost themes and Handlebars templates
- Ghost Content API and Admin API

## Sources Consulted
- Ghost Docker official image documentation: https://hub.docker.com/_/ghost/
- Ghost Docker installation documentation: https://docs.ghost.org/install/docker/
- Ghost configuration documentation: https://docs.ghost.org/config/
- Ghost theme structure documentation: https://docs.ghost.org/themes/structure/
- Ghost Content API documentation: https://ghost.org/docs/content-api/
- Ghost Admin API documentation: https://ghost.org/docs/admin-api/
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- MySQL Docker official image documentation: https://hub.docker.com/_/mysql
- Podman rootless mode documentation: https://docs.podman.io/en/v4.7.2/markdown/podman.1.html

## Issues Found
- The image pull section described `ghost:5` as the latest Ghost image. The current official image uses Ghost 6 for the `latest` and `6` tags, so the text was changed to say it pulls the Ghost 5 image.
- The custom theme example omitted `post.hbs`. Ghost themes require `index.hbs`, `post.hbs`, and `package.json`, so a minimal `post.hbs` template was added.
- The Admin API `/site/` command was described as a health check. Ghost documents it as a basic unauthenticated site information endpoint, so the comment was changed accordingly.

## Review Notes
- The Podman CLI examples use valid options for detached containers, published ports, named volumes, SELinux relabeling, and pods.
- The Ghost nested environment variable syntax using double underscores matches Ghost configuration documentation.
- The MySQL environment variables match the MySQL official image documentation.
- The guide intentionally uses Ghost 5. For a new production deployment, readers may prefer to evaluate the current Ghost 6 image and migration requirements.
