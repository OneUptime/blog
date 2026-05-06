# Validation Summary: How to Choose the Right Base Image for Containers in Portainer

## Status
not-technically-relevant

## Post Type
Tutorial / Guide (Portainer and Docker Compose deployment walkthrough)

## Technologies Covered
- Portainer stacks
- Docker Compose / Compose Specification
- Docker CLI (`docker exec`, `docker info`, `docker logs`, `docker run`)
- PostgreSQL (`pg_isready`, `pg_dump`)
- Redis (`redis-cli`)
- Nginx reverse proxy configuration
- Uptime Kuma

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer relative path volume docs: https://docs.portainer.io/advanced/relative-paths
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference (`depends_on`, `healthcheck`, `deploy`, volumes semantics): https://docs.docker.com/reference/compose-file/services/
- Docker bind mounts docs: https://docs.docker.com/engine/storage/bind-mounts/
- Docker `docker container exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/current/app-pg-isready.html
- PostgreSQL `pg_dump` docs: https://www.postgresql.org/docs/current/app-pgdump.html
- Redis CLI docs: https://redis.io/docs/latest/develop/tools/cli/
- Nginx proxy module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
The post is technically related to containers and Portainer, but it is not a coherent or salvageable article on the stated topic. It reads like a generic deployment placeholder rather than a correct guide about choosing container base images. Specific defects:

1. **Topic mismatch throughout the post** — The title and description promise guidance on choosing the right base image, but the body never explains base image selection criteria such as compatibility, libc choice, security posture, image provenance, package availability, or size tradeoffs. Instead, it walks through deploying a generic multi-container application stack in Portainer.

2. **Primary example is a placeholder and not meaningfully deployable** — The main service uses `image: app-image:latest`, which is not a real image reference. The rest of the post then assumes application-specific behavior without defining any actual application image, startup contract, or runtime requirements.

3. **Framework assumptions conflict with each other** — The stack sets `NODE_ENV=production`, which implies a Node.js application, but Step 4 runs Django management commands (`./manage.py migrate` and `./manage.py createsuperuser`). Those are not interchangeable, and no official image or application definition is provided to make the example coherent.

4. **Healthcheck and verification steps are inconsistent** — The Compose healthcheck probes `http://localhost:8080/health`, while the later verification step uses `curl http://localhost:8080/api/health`. A reader cannot know which endpoint is supposed to exist, and the post does not define an application that would provide either endpoint.

5. **Portainer workflow conflicts with the Nginx bind-mount example** — The post instructs the reader to use Portainer's stack editor, but the Nginx service mounts `./nginx.conf` and `./certs` as relative host paths. Portainer's own docs state that relative path support is only available in Business Edition when deploying from Git with relative path volumes explicitly enabled. Docker's Compose docs also limit relative host paths to local-runtime deployments. As written, this is not a generally valid Portainer stack-editor example.

6. **`deploy.resources` is presented as if it will be enforced everywhere** — Docker's Compose reference states that the `deploy` section is optional and ignored if not implemented. In other words, the post presents CPU and memory limits as a guaranteed outcome without qualifying that this depends on the target platform and stack deployment mode.

7. **Several commands target the wrong container or wrong protocol** — `docker exec app pg_isready -h postgres -U appuser` assumes PostgreSQL client utilities are present in the application container, but the stack only guarantees them in the PostgreSQL container. `docker exec app curl -I http://postgres:5432` is also technically wrong because PostgreSQL speaks its own wire protocol on port 5432, not HTTP. PostgreSQL's official docs identify `pg_isready` as the correct readiness check utility.

8. **Step 4 is internally contradictory** — It says "Access via Portainer container console" and then tells the reader to run `docker exec ...` commands. If you are already inside a container console, you would not run `docker exec` from there; that command is executed from the Docker host.

Because the article is off-topic for its title and built around placeholder, internally inconsistent examples, it cannot be corrected with line-level technical edits. Making it valid would require rewriting it into a different post entirely, either as a real guide to base-image selection or as a coherent deployment tutorial for a specific application. Marking as `not-technically-relevant`.

## Review Notes
- `version: "3.8"` is obsolete in the current Compose Specification and is only retained for backward compatibility.
- The repeated use of `:latest` tags works against reproducibility, which is especially awkward in a post that claims to help readers choose images intentionally.
- The prerequisite commands (`free`, `df`, `nproc`) are Linux-host specific. That is not the main issue here, but the post does not say it is assuming a Linux Docker host.
