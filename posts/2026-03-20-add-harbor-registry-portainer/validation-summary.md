# Validation Summary: How to Add a Harbor Registry to Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harbor
- Portainer
- Docker CLI
- Docker Compose / Stack YAML
- Harbor REST API

## Sources Consulted
- Portainer documentation, "Add a custom registry": https://docs.portainer.io/admin/registries/add/custom
- Portainer documentation, "Add a new registry": https://docs.portainer.io/admin/registries/add
- Portainer documentation, "Registries": https://docs.portainer.io/admin/registries
- Harbor documentation, "Create Project Robot Accounts": https://goharbor.io/docs/2.10.0/working-with-projects/project-configuration/create-robot-accounts/
- Harbor documentation, "Project Configuration": https://goharbor.io/docs/main/working-with-projects/project-configuration/
- Harbor documentation, "Vulnerability Scanning": https://goharbor.io/docs/2.14.0/administration/vulnerability-scanning/
- Harbor documentation, "Sign Artifacts with Cosign or Notation": https://goharbor.io/docs/2.14.0/working-with-projects/working-with-images/sign-images/
- Harbor OpenAPI spec (`swagger.yaml`): https://raw.githubusercontent.com/goharbor/harbor/main/api/v2.0/swagger.yaml
- Docker documentation, "`docker login`": https://docs.docker.com/reference/cli/docker/login/
- Docker documentation, "Verify repository client with certificates": https://docs.docker.com/engine/security/certificates/
- Docker documentation, "`dockerd`": https://docs.docker.com/reference/cli/dockerd/
- CNCF Harbor project page: https://www.cncf.io/projects/harbor/

## Issues Found
- The Harbor robot-account creation flow was outdated. The post said **Add Robot Account**, but current Harbor docs use **New Robot Account**. I updated the step accordingly.
- The Harbor permissions guidance was imprecise. The post implied `Push` or `Pull` was sufficient, but Harbor requires `Pull Repository` and does not allow `Push Repository` by itself. I corrected the permission guidance.
- The Harbor username example was outdated for current project-scoped robot accounts. The post used `robot$portainer-puller`, but current Harbor project robot accounts follow `<prefix><project_name>+<account_name>`. I updated the example and troubleshooting text to use the full robot name as displayed by Harbor.
- The Portainer navigation and form details were incomplete. The post said **Settings > Registries** and omitted the required registry name field. I changed this to **Registries > Add registry** and added the **Name** field.
- The `docker login` example used the less-safe `-p` flag and an outdated username example. I replaced it with `--password-stdin` and a current robot-account example based on Harbor’s documented format.
- The content-trust recommendation was outdated. The post specifically recommended Notary, while current Harbor releases document content trust with Cosign or Notation. I updated the wording to match current Harbor docs.
- The deployment-security explanation was inaccurate. Harbor’s documented behavior is to prevent vulnerable images from being pulled when the project’s **Prevent vulnerable images from running** setting and severity threshold are enabled. I changed the wording to reflect Harbor’s actual control.
- The Harbor API example used the wrong vulnerability endpoint. I replaced `/artifacts/latest/vulnerabilities` with the current documented `/artifacts/latest/additions/vulnerabilities` endpoint and added the documented `X-Accept-Vulnerabilities` header.
- The self-signed certificate troubleshooting guidance was too vague and framed `--insecure-registry` like a Docker CLI flag. I corrected this to recommend trusting the CA certificate first, with insecure-registry configuration only as a non-production daemon-level fallback.

## Review Notes
- Harbor robot-account behavior is version-sensitive. Harbor 2.2+ uses the newer project-scoped robot-account naming format, while legacy robot accounts still use `robot$<account_name>`.
- Harbor content trust is also version-sensitive. Older Harbor docs emphasized Notary, while current Harbor releases document Cosign and Notation as the primary signing and verification paths.
