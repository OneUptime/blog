# Validation Summary: How to Search Docker Hub for Images in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Hub
- Docker CLI (`docker search`)
- Docker Official Images / Verified Publisher images
- Docker Scout
- Trivy
- Docker Compose

## Sources Consulted
- Portainer "Add a new container" documentation: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer "Add a new service" documentation: https://docs.portainer.io/user/docker/services/add
- Portainer "Images" documentation: https://docs.portainer.io/user/docker/images
- Docker CLI `docker search` reference: https://docs.docker.com/reference/cli/docker/search/
- Docker Hub trusted content documentation: https://docs.docker.com/docker-hub/image-library/trusted-content/
- Docker Official Images documentation: https://docs.docker.com/docker-hub/repos/manage/trusted-content/official-images/
- Docker Scout `docker scout cves` reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Hub official image pages for nginx, postgres, redis, node, and mongo: https://hub.docker.com/_/nginx/, https://hub.docker.com/_/postgres, https://hub.docker.com/_/redis, https://hub.docker.com/_/node/, https://hub.docker.com/_/mongo/
- Docker Hub repository pages for Bitnami, Grafana, and HashiCorp examples: https://hub.docker.com/r/bitnami/nginx/, https://hub.docker.com/r/bitnami/postgresql/, https://hub.docker.com/r/grafana/grafana/, https://hub.docker.com/r/hashicorp/vault/
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- NGINX download / release channels page: https://nginx.org/en/download.html
- Trivy image command reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_image/

## Issues Found
1. **Incorrect Portainer navigation for Docker Hub search.** The post said to search from the `Images` page. Current Portainer docs document Docker Hub image search from the image selector when adding a container, and similarly when adding a Swarm service. Updated Step 1 and the introduction to match documented Portainer behavior.
2. **Overstated explanation of Docker Official Images.** The original wording implied official images are simply "maintained by Docker" and universally "security-scanned by Docker". Docker's official documentation describes them as curated and published by Docker in collaboration with upstream maintainers. Reworded this section and aligned the badge explanation with Docker's current terminology.
3. **Incorrect official image name for MongoDB.** The post listed `mongodb` as the official image name. The Docker Official Image is `mongo`. Corrected the example list.
4. **Misclassified verified-publisher example.** `elastic/elasticsearch` was presented as a Docker Verified Publisher example, but the reviewed Docker Hub sources did not support that classification in the same way as the listed Bitnami, Grafana, and HashiCorp examples. Removed that example.
5. **Stale dynamic sample output.** The post included fixed Docker Hub star counts and a fixed vulnerability-scan result (`Total: 0`). Those values change over time and were not reliable as static examples. Replaced them with stable descriptions and explicitly marked vulnerability-scan output as variable.
6. **Outdated tag and version examples.** Several tag examples and the production pinning examples used older versions, and the NGINX example incorrectly described `nginx:1.25` as a stable release. Updated the examples to current documented tags and corrected the NGINX stable-series guidance.
7. **Heuristics presented as hard thresholds.** The image-selection table used rigid thresholds such as "`>1000` stars" and "updated within 3 months". These are not authoritative rules. Reworded them as general evaluation heuristics.

## Review Notes
- `docker-compose.yml` remains technically valid, although newer Docker documentation often prefers `compose.yaml`.
- Portainer's documentation confirms that the Docker Hub search is intended to help confirm the correct image name and tag. It does not document a rich results schema on the `Images` page, so the revised post avoids over-claiming Portainer UI fields there.
- The Trivy container example is a minimal remote-image scan. Trivy's documentation recommends mounting cache storage and, when scanning local Docker images from inside the Trivy container, mounting the Docker socket as well.
