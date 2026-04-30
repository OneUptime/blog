# Validation Summary: How to Deploy Harbor Registry via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harbor
- Portainer
- Docker Engine
- Docker Compose
- Docker Registry / OCI image workflows
- Trivy
- TLS / HTTPS certificates

## Sources Consulted
- Harbor installation prerequisites: https://goharbor.io/docs/edge/install-config/installation-prereqs/
- Harbor installer download docs: https://goharbor.io/docs/edge/install-config/download-installer/
- Harbor `harbor.yml` configuration docs: https://goharbor.io/docs/main/install-config/configure-yml-file/
- Harbor HTTPS configuration docs: https://goharbor.io/docs/main/install-config/configure-https/
- Harbor lifecycle and reconfiguration docs: https://goharbor.io/docs/edge/install-config/reconfigure-manage-lifecycle/
- Harbor project configuration docs: https://goharbor.io/docs/main/working-with-projects/project-configuration/
- Harbor vulnerability scanning docs: https://goharbor.io/docs/main/administration/vulnerability-scanning/
- Harbor scan results workflow: https://goharbor.io/docs/2.13.0/administration/vulnerability-scanning/scan-individual-artifact/
- Harbor upgrade guide: https://goharbor.io/docs/main/administration/upgrade/
- Harbor releases page: https://github.com/goharbor/harbor/releases
- Harbor v2.15.0 release assets: https://api.github.com/repos/goharbor/harbor/releases/tags/v2.15.0
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer relative path support docs: https://docs.portainer.io/advanced/relative-paths
- Portainer custom registry docs: https://docs.portainer.io/admin/registries/add/custom
- Portainer custom CA guidance: https://docs.portainer.io/faqs/troubleshooting/certificates-and-security/how-can-i-use-my-custom-certificate-authority-ca-with-portainer
- Docker `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- Docker `docker image tag` reference: https://docs.docker.com/engine/reference/commandline/tag/
- Docker `docker image push` reference: https://docs.docker.com/engine/reference/commandline/image_push/

## Issues Found
- The post said Harbor recommends the offline installer generally. Harbor's official docs describe both online and offline installers and reserve the offline installer for cases where the target host lacks Internet access. I corrected that wording.
- The download command labeled a pinned `v2.11.0` asset as the "latest" Harbor release. As of April 30, 2026, Harbor `v2.15.0` is the latest release on the official Harbor releases page. I updated the example to `v2.15.0` and made the command version-parameterized.
- The prerequisites were inaccurate and incomplete. Harbor's official prerequisites require Docker Engine `> 20.10`, Docker Compose `> 2.3`, and minimum host resources of 2 CPU, 4 GB RAM, and 40 GB disk. I corrected the prerequisites accordingly.
- The post implied `install.sh` only generated `docker-compose.yml`. Harbor's docs state that `install.sh` installs and starts Harbor. I updated the text and added a `docker compose down` handoff step before importing the deployment into Portainer, avoiding a duplicate live deployment.
- The Portainer stack section understated the relative-path issue. Portainer documents relative path support for Git-based stack deployments, while Harbor's generated compose file uses relative paths. I changed the instructions to convert those bind mounts to absolute `/opt/harbor` paths before upload.
- The Harbor UI step said to change the admin password under **Administration** → **Users**. Harbor's docs explicitly state you cannot reset your own password there. I removed the incorrect UI path and kept the requirement to change the default password immediately after first sign-in.
- The Portainer registry step omitted the required registry name field. Portainer's custom registry docs require both a name and URL. I added the missing `Name` field.
- The post told readers to push to `myproject` without first creating the project. Harbor requires the project to exist before the push. I added that prerequisite to the workflow.
- The post omitted certificate trust requirements for self-signed or privately issued certificates. Harbor's HTTPS docs require Docker clients to trust the Harbor CA, and Portainer documents separate CA trust handling. I added notes for both Portainer and Docker clients.
- The vulnerability scanning section sent readers to **Interrogation Services** to view scan results. Harbor uses **Interrogation Services** for scanner management, while scan results are viewed from project repositories and artifact details. I corrected the UI path.
- The update section incorrectly suggested that version upgrades could be handled by rerunning `install.sh`. Harbor's upgrade guide requires version-aware migration steps and may require `harbor.yml` and database migration. I replaced that guidance with the official upgrade workflow reference.

## Review Notes
- Harbor's documentation site currently exposes `main` docs with `2.14.0` marked as the latest documentation version, while the official GitHub releases page shows `v2.15.0` as the latest release as of March 20, 2026. The install and configuration flow used in the post remains compatible with the corrected example release.
- The tutorial is now technically sound, but Harbor's generated compose file remains more awkward to manage in Portainer than typical hand-authored stacks because the installer-generated assets assume a local Harbor working directory.
