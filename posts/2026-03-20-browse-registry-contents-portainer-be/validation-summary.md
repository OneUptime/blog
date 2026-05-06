# Validation Summary: How to Browse Registry Contents in Portainer Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Container registries
- Docker Registry HTTP API V2
- CNCF Distribution (Docker Registry)
- `curl`

## Sources Consulted
- Portainer docs, Registries: https://docs.portainer.io/admin/registries
- Portainer docs, Browse a registry: https://docs.portainer.io/admin/registries/browse
- Portainer docs, Manage a registry: https://docs.portainer.io/admin/registries/manage
- CNCF Distribution docs, HTTP API V2: https://distribution.github.io/distribution/spec/api/
- CNCF Distribution docs, Garbage collection: https://distribution.github.io/distribution/about/garbage-collection/
- CNCF Distribution docs, Configuring a registry: https://distribution.github.io/distribution/about/configuration/
- Official registry image packaging, `Dockerfile`: https://github.com/distribution/distribution-library-image

## Issues Found
- The navigation steps were inaccurate. The post said to go to `Settings > Registries` and click the registry itself, but Portainer's documentation says to select `Registries` from the menu and click `Browse` next to the registry. I corrected the access steps to match the documented UI flow.
- The post overstated the details exposed by the registry browser. It claimed the browser shows digest, size, creation date, and layers, while Portainer's browse documentation describes repository and tag browsing plus repository information such as the repository name, image count, and list of tags. I rewrote the description and capability bullets to match the documented behavior.
- The tag deletion and retagging sections omitted Portainer's documented prerequisite for self-hosted Docker registries. Portainer requires `REGISTRY_STORAGE_DELETE_ENABLED=TRUE` for tag removal and retagging on self-hosted registries, and the UI action is `Remove`. I added the prerequisite and corrected the removal step wording.
- The garbage-collection example was outdated and incomplete for the current official registry image. I updated the note to mention the documented read-only requirement before garbage collection and changed the example command to use `/bin/registry` with the current official image config path `/etc/distribution/config.yml`.

## Review Notes
- The Registry HTTP API examples are valid for registries that expose the standard V2 endpoints and accept the provided authentication method. Some registry providers may use different auth flows even though the endpoints themselves are standardized.
- Portainer's documentation is versioned. This review was validated against the current documentation available on May 6, 2026, including the current `admin/registries` pages.
