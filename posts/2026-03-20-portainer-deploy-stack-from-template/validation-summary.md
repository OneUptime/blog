# Validation Summary: How to Deploy a Stack from a Template in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Docker Swarm
- Git-backed stack templates

## Sources Consulted
- Portainer Documentation, "Deploy a stack" - https://docs.portainer.io/user/docker/templates/deploy-stack
- Portainer Documentation, "App template JSON format" - https://docs.portainer.io/advanced/app-templates/format
- Portainer Documentation, "Custom templates" - https://docs.portainer.io/user/docker/templates/custom
- Portainer Documentation, "Inspect or edit a stack" - https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Documentation, "Create a template from a deployed stack" - https://docs.portainer.io/user/docker/stacks/template
- Portainer official templates repository, template definitions - https://raw.githubusercontent.com/portainer/templates/master/templates-2.0.json
- Portainer official templates repository, Dokku compose example - https://raw.githubusercontent.com/portainer/templates/master/stacks/dokku/docker-compose.yml

## Issues Found
- The post described `type: 2` as a generic stack template while using a `docker-compose.yml` path. Portainer's official schema distinguishes `type: 2` for Swarm stacks and `type: 3` for Compose stacks. I corrected the explanation and replaced the JSON example with an official Compose stack template example.
- The UI navigation referred to `App Templates` and `App Templates > Custom Templates`. Current Portainer documentation uses `Templates > Application` for built-in templates and `Templates > Custom` for custom templates. I updated both paths.
- The list of example stack templates included entries such as Ghost, Nextcloud, Gitea, and MEAN that are not present in Portainer's official stack template set. I replaced that list with stack template examples from the official Portainer templates repository.
- The Ghost variable example and Compose snippet were not representative of Portainer's official stack template examples. I replaced them with an official Dokku template variable example and the corresponding compose file snippet from Portainer's templates repository.
- The post stated that the `Editor` workflow applied unconditionally after deployment. Portainer documents the `Editor` tab as deployment-method-dependent, so I changed the update guidance to make that conditional.
- The custom template section omitted that template variables with `{{ }}` are a Portainer Business Edition feature. I added that restriction.
- The deployment and verification steps assumed container-only behavior. I adjusted the wording to cover both containers and services, which is more accurate across Docker Standalone, Podman, and Swarm environments.

## Review Notes
- The post is now technically accurate against current Portainer documentation and the official Portainer templates repository as reviewed on 2026-04-24.
- Portainer's current documentation and official templates repository are not perfectly aligned on every Compose-file detail, so avoiding overly specific claims about stack-file internals is the safer approach for future revisions.
