# Validation Summary: How to Create a Stack from a Custom Template in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition custom templates
- Portainer app templates
- Docker Compose
- WordPress Docker Official Image
- MySQL Docker Official Image

## Sources Consulted
- Portainer Docs: Custom templates - https://docs.portainer.io/user/docker/templates/custom
- Portainer Docs: Deploy a stack - https://docs.portainer.io/user/docker/templates/deploy-stack
- Portainer Docs: App templates - https://docs.portainer.io/advanced/app-templates
- Portainer Docs: App template JSON format - https://docs.portainer.io/advanced/app-templates/format
- Portainer Docs: Settings / App Templates - https://docs.portainer.io/admin/settings/general
- Portainer Docs: Build and host your own app templates - https://docs.portainer.io/sts/advanced/app-templates/build
- Portainer official templates repository - https://github.com/portainer/templates
- Portainer official WordPress compose example - https://raw.githubusercontent.com/portainer/templates/master/stacks/wordpress/docker-compose.yml
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub: WordPress Official Image - https://hub.docker.com/_/wordpress
- Docker Hub: MySQL Official Image - https://hub.docker.com/_/mysql

## Issues Found
- The post mixed up Portainer Custom Templates with App Templates. I corrected the terminology, navigation, and deployment steps so the main workflow now matches Portainer's documented Custom Templates flow (`Templates` -> `Custom`).
- The original custom-template Compose example used Go-template-style `.Values` syntax and an environment-variable explanation that does not match Portainer custom templates. I replaced it with Portainer's documented `{{ }}` placeholder style and updated the variable-configuration step accordingly.
- The prerequisites said Portainer CE or BE, but Portainer documents Custom Templates as a Business Edition feature. I updated the introduction and prerequisites to reflect that.
- The external JSON example was presented as a custom-template feature and used an invalid top-level structure. I corrected it to the documented app-template JSON wrapper (`version` plus `templates`) and clarified that this is the separate App Templates feature.
- The category examples were labeled as JSON while containing inline comments, which makes them invalid JSON. I converted them to plain text examples.
- The conclusion claimed hosted templates automatically flow updates to all Portainer instances. I narrowed this to the documented behavior: Portainer can use a hosted App Templates JSON URL for a shared catalog.

## Review Notes
- Portainer's documentation treats Custom Templates and App Templates as separate features. Future posts should avoid using those names interchangeably.
- Docker Compose now treats the top-level `version` field as obsolete. The custom-template Compose example was updated to omit it.
- Portainer's app-template documentation still describes the version `2` JSON format, while the official templates repository notes newer templates on the `v3` branch. This review kept the post aligned with the format Portainer currently documents.
