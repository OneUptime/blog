# Validation Summary: How to Add a Harbor Registry to Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Harbor
- Docker Registry HTTP API V2
- Docker CLI
- Cosign
- Notation

## Sources Consulted
- Portainer docs, "Add a new registry": https://docs.portainer.io/admin/registries/add
- Portainer docs, "Add a custom registry": https://docs.portainer.io/admin/registries/add/custom
- Portainer docs, "Browse a registry": https://docs.portainer.io/admin/registries/browse
- Harbor docs, "Create System Robot Accounts": https://goharbor.io/docs/edge/administration/robot-accounts/
- Harbor docs, "Create Project Robot Accounts": https://goharbor.io/docs/2.9.0/working-with-projects/project-configuration/create-robot-accounts/
- Harbor docs, "Pulling and Pushing Images in the Docker Client": https://goharbor.io/docs/latest/working-with-projects/working-with-images/pulling-pushing-images/
- Harbor docs, "Sign Artifacts with Cosign or Notation": https://goharbor.io/docs/2.14.0/working-with-projects/working-with-images/sign-images/
- Harbor docs, "Implementing Content Trust": https://goharbor.io/docs/2.9.0/working-with-projects/project-configuration/implementing-content-trust/
- Harbor docs, "Vulnerability Scanning": https://goharbor.io/docs/main/administration/vulnerability-scanning/
- Harbor docs, "Project Configuration": https://goharbor.io/docs/main/working-with-projects/project-configuration/
- Docker docs, `docker login`: https://docs.docker.com/reference/cli/docker/login/
- Docker docs, "Verify repository client with certificates": https://docs.docker.com/engine/security/certificates/
- Docker docs, "Content trust in Docker": https://docs.docker.com/engine/security/trust/

## Issues Found
- Portainer current documentation does not list Harbor as a native registry provider. I updated the post to add Harbor as a `Custom registry` instead of selecting a nonexistent `Harbor` provider.
- The robot account section mixed system-scoped and project-scoped Harbor workflows. I made the main setup consistently system-scoped, corrected the Harbor permission names to the official labels, and clarified that the robot name prefix is configurable rather than always `robot$`.
- The project robot account example used an imprecise naming pattern and slightly wrong navigation text. I corrected the path to `Projects → {project-name} → Robot Accounts` and updated the generated username example to match Harbor’s documented `<prefix><project_name>+<account_name>` format.
- The connectivity check used `docker login -p` and an API call that would require extra permissions unrelated to the stated minimal Portainer access. I replaced that with a `docker login --password-stdin` example followed by a real image pull test.
- The content trust section was based on outdated Docker Content Trust / Notary-style guidance and included an invalid Docker daemon configuration snippet for this use case. I replaced it with Harbor’s current Cosign/Notation-based content trust model and Harbor-side enforcement workflow.
- The vulnerability scanning section used an incorrect Harbor API path and overstated the UI flow. I updated the scanner configuration steps to match current Harbor docs and corrected the API example to use `/additions/vulnerabilities`.
- The Portainer BE browsing section implied Harbor-specific project navigation in Portainer. I adjusted it to the generic repository/tag browsing behavior Portainer documents for API v2 registries.

## Review Notes
- Harbor v2.x spans multiple documentation eras. Older Harbor releases documented Notary-based signing, while current Harbor documentation uses Cosign and Notation. The post now reflects the current Harbor documentation rather than older 2.x behavior.
- Portainer Business Edition registry browsing is BE-only; the post already scopes browsing to BE and now matches the documented generic registry browser behavior.
