# Validation Summary: How to Use the EXPOSE Instruction in Dockerfiles (and What It Actually Does)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfile `EXPOSE`
- Docker CLI port publishing
- Docker networking
- Docker Compose
- npm

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/#expose
- Docker `docker container run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker port publishing and mapping documentation: https://docs.docker.com/engine/network/port-publishing/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/#expose
- Docker `docker container port` CLI reference: https://docs.docker.com/reference/cli/docker/container/port/
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/providers/docker/
- Local Docker CLI help output for `docker run`, `docker port`, and `docker inspect`
- Local npm CLI help output for `npm ci`

## Issues Found
- The Node.js Dockerfile example used `npm ci --only=production`. Current npm help documents `--omit=dev` for omitting development dependencies, so the example was updated to `npm ci --omit=dev`.
- The automated tooling section claimed orchestration systems use `EXPOSE` for health check configuration. Docker's EXPOSE metadata documents/listens ports and is used by publishing/inspection/tooling, but health checks require explicit health check configuration. The bullet was changed to say container platforms and UIs can surface exposed-port metadata.

## Review Notes
The remaining Dockerfile syntax, `docker run -p`, `docker run -P`, UDP protocol examples, `docker port`, Docker network behavior, and Docker Compose `expose`/`ports` examples match the official Docker documentation. Docker's ephemeral port range is host-dependent; the post's stated range is a common Linux default and is presented as typical rather than universal.
