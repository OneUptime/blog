# Validation Summary: How to Pull and Run a Docker Image in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker images and containers
- Docker Hub
- Private container registries

## Sources Consulted
- Portainer Documentation: Pull an image - https://docs.portainer.io/user/docker/images/pull
- Portainer Documentation: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Portainer Documentation: Add a new container - https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Documentation: How does the image update notification icon work? - https://docs.portainer.io/faqs/troubleshooting/how-does-the-image-update-notification-icon-work
- Docker Docs: `docker image pull` - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs: `docker container run` - https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: Registry mirror configuration - https://docs.docker.com/docker-hub/image-library/mirror/

## Issues Found
- The digest example `nginx@sha256:abc123...` was not a valid digest reference. It was replaced with a full digest example from Docker's official documentation.
- The private-registry pull steps mixed Portainer simple mode and advanced mode. The example was corrected so that when a configured registry is selected in Portainer, the image field uses the image name (`myapp:2.0`) instead of the full registry URL.
- The "Via the Images Section" instructions referenced an unverified image-details deployment action. They were rewritten to the documented flow: confirm the image is present, then deploy from `Containers > Add container`.
- The "Keeping Images Updated" section incorrectly described an image-level update indicator and pull action. It was corrected to reflect the documented behavior of pulling the same tag again and then recreating containers to use the newer image.
- The troubleshooting path `Settings > Registries` was incorrect. It was corrected to `Registries`.
- The registry mirror JSON was changed from a specific third-party hostname to Docker's documented generic mirror-host pattern.

## Review Notes
- Portainer's documentation notes that in multi-node environments, pulled images are available only on the selected node. The post is still correct for single-node setups, but this caveat could be added in a future revision.
- Portainer's image update indicator documentation applies to containers, stacks, and services rather than the Images list itself.
