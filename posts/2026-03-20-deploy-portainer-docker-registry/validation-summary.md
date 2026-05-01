# Validation Summary: How to Deploy Portainer with a Docker Registry (Distribution)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Compose
- CNCF Distribution (Docker Registry)
- Portainer CE
- OpenSSL
- Apache `htpasswd` / `apache2-utils`

## Sources Consulted
- CNCF Distribution: Deploy a registry server - https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution: Configuring a registry - https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution: Test an insecure registry - https://distribution.github.io/distribution/about/insecure/
- Docker Docs: `docker login` CLI reference - https://docs.docker.com/reference/cli/docker/login/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Portainer Docs: Pull an image - https://docs.portainer.io/user/docker/images/pull
- Portainer Docs: Install Portainer CE with Docker on Linux - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux

## Issues Found
- The original post configured `htpasswd` authentication on a plain HTTP registry. Docker Distribution documents that basic authentication must be used with TLS, and the insecure-registry guidance explicitly notes that insecure registries cannot be used with basic authentication. I fixed this by enabling TLS in the main Compose example, switching the Portainer registry URL and API verification example to `https://`, and adding certificate trust instructions for Docker hosts.
- The registry image example used `registry:2`, while current official Distribution deployment examples use `registry:3`. I updated the Compose snippet to `registry:3`.
- The Portainer example used `portainer/portainer-ce:latest`. Portainer’s current installation examples use the `lts` tag. I updated the Compose snippet to `portainer/portainer-ce:lts`.
- The Compose file included the top-level `version: "3.8"` field. Docker Compose v2 documents this field as obsolete. I removed it.
- The self-signed certificate command relied only on the certificate common name. Modern TLS validation requires a subject alternative name for hostname verification. I updated the `openssl` command to add `subjectAltName`.
- The `docker login` example passed the password on the command line with `-p`. Docker’s CLI reference recommends `--password-stdin` for non-interactive use. I updated the command accordingly.
- The authentication step was labeled optional even though the rest of the guide depends on configured registry credentials, and its inline comment implied the password was supplied as a command argument. I corrected the wording to match the actual `htpasswd` behavior.

## Review Notes
- The post now assumes TLS from the initial deployment path because that is required for a basic-authenticated registry to work correctly with Docker clients.
- The `apache2-utils` installation command is Debian/Ubuntu-specific; the post now says so explicitly.
- Docker was not installed in the review environment, so runtime execution was not possible. Commands and configuration were validated against official documentation instead.
