# Validation Summary: How to Use Portainer for Media and Content Delivery

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Compose / stack files
- Docker Engine API
- Redis / redis-cli
- Nginx
- Varnish
- RTMP / HLS
- ClickHouse

## Sources Consulted
- Portainer Services documentation: https://docs.portainer.io/user/docker/services
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access token documentation: https://docs.portainer.io/2.21/api/access
- Docker Swarm stack deployment documentation: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker `service create` reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose variable interpolation documentation: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Engine API reference (`/services/{id}` and `/services/{id}/update`): https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Varnish official image Dockerfile: https://raw.githubusercontent.com/varnish/docker-varnish/master/stable/debian/Dockerfile
- Varnish official image entrypoint: https://raw.githubusercontent.com/varnish/docker-varnish/master/stable/debian/scripts/docker-varnish-entrypoint
- NGINX `default_type` documentation: https://nginx.org/r/default_type
- NGINX `mime.types` file: https://raw.githubusercontent.com/nginx/nginx/master/conf/mime.types
- tiangolo/nginx-rtmp image README: https://raw.githubusercontent.com/tiangolo/nginx-rtmp-docker/master/README.md

## Issues Found
- The post mixed general Portainer guidance with Docker Swarm-only service operations. I added an explicit Swarm assumption in the introduction because Portainer service management and scaling apply to Swarm endpoints.
- The SRT ingest port was published as TCP. I changed `9000:9000` to `9000:9000/udp` because SRT uses UDP.
- The CDN origin example exposed HTTPS and mounted certificates, but the provided `nginx.conf` only defined an HTTP server. I removed the unused `443` publishing and certificate mount so the snippet matches the configuration actually shown.
- The custom `nginx.conf` replaced the full default NGINX config without re-including MIME mappings. I added `include /etc/nginx/mime.types;` and `default_type application/octet-stream;` so HLS playlist and segment files are served with proper types from the standard NGINX mappings.
- The Varnish service published `6081:6081`, which does not match the official image defaults. I changed it to `6081:80` after checking the official image Dockerfile and entrypoint behavior.
- The autoscaling script used the wrong service name for a Swarm stack and called a non-standard `/scale` endpoint with an incomplete payload. I rewrote it to inspect the stack-qualified service name, read `Version.Index`, update `Spec.Mode.Replicated.Replicas`, and call the Docker-compatible update endpoint through Portainer.
- The live streaming stack used `depends_on` even though this post is scoped to Swarm stacks. I removed it to avoid implying startup ordering guarantees that should not be relied on in this deployment model.
- The watermarking service was created outside the stack but referenced the stack's Redis queue by the short hostname `queue`. I attached it to the stack network and switched the queue URL to the stack-qualified service name so name resolution is explicit.
- The live streaming and analytics examples used named volumes without top-level declarations. I added `live-segments` and `analytics-data` under `volumes:` for valid, explicit Compose definitions.

## Review Notes
- The `media/*` images are illustrative custom application images, so I could validate the Docker, Portainer, networking, and configuration mechanics around them, but not the application-specific environment variables inside those images without separate vendor documentation.
- The GPU transcoder example assumes the Swarm nodes are already prepared with NVIDIA runtime / GPU support on the hosts.
- `tiangolo/nginx-rtmp:latest` is valid, but it is a moving tag. A pinned dated tag would make the example more reproducible over time.
