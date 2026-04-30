# Validation Summary: How to Hide Docker Hub from the Registry Dropdown in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Hub
- Container registry management
- Portainer API

## Sources Consulted
- Portainer documentation, Registries: https://docs.portainer.io/admin/registries
- Portainer documentation, Docker host registries: https://docs.portainer.io/user/docker/host/registries
- Portainer documentation, Docker registry policies: https://docs.portainer.io/admin/environments/policies/docker-policies/registry-policy
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer CE API reference 2.39.1: https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Portainer official documentation repository, `admin/registries/README.md`: https://github.com/portainer/portainer-docs/blob/develop/admin/registries/README.md
- Portainer official source, `app/react/portainer/registries/ListView/RegistriesDatatable/columns/DefaultRegistryAction.tsx`: https://github.com/portainer/portainer/blob/develop/app/react/portainer/registries/ListView/RegistriesDatatable/columns/DefaultRegistryAction.tsx
- Portainer official source, `app/docker/components/imageRegistry/por-image-registry.controller.js`: https://github.com/portainer/portainer/blob/develop/app/docker/components/imageRegistry/por-image-registry.controller.js

## Issues Found
- The post described hiding Docker Hub as a per-environment setting under **Settings > Registries**. Portainer documents this as a global action on the **Registries** page using **Hide for all users**, so the steps were corrected.
- The post did not mention that the current Portainer implementation exposes the hide control as a Business Edition feature. That scope note was added so the instructions match the current product behavior.
- The post said hiding Docker Hub disables it. Portainer documents that anonymous Docker Hub access is built into Docker itself, so hiding it only removes it from Portainer's registry dropdown and may still show it when no other registries are available. The wording was corrected.
- The section about **Allow users to use public images** under environment security settings could not be verified in current Portainer documentation or API references. It was replaced with documented registry access controls and Docker registry policies.
- The API example using `PUT /api/registries/1` with `{\"restricted\": true}` is not supported by the current Portainer API reference. It was removed and replaced with a note that the documented API does not expose that registry flag.
- The post claimed you can set a private registry as the default and that hidden Docker Hub would cause YAML-based stack pulls to fail. Current Portainer behavior does not support those claims as written, so they were replaced with accurate guidance about registry access and the limits of the UI hide option.

## Review Notes
- Portainer's current documentation emphasizes that hiding **Docker Hub (anonymous)** is a UI control, not a hard enforcement mechanism.
- For stronger enforcement, Portainer's documented registry access controls and Docker registry policies are the technically supported controls to reference.
