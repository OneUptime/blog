# Validation Summary: How to Set Up Portainer for Media and Content Delivery

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Docker volumes
- FFmpeg
- Nginx
- nginx-rtmp-module
- HLS streaming

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker volumes and Swarm volume behavior: https://docs.docker.com/engine/storage/volumes/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer relative path volumes docs: https://docs.portainer.io/advanced/relative-paths
- Portainer service scaling docs: https://docs.portainer.io/user/docker/services/scale
- Portainer container stats docs: https://docs.portainer.io/sts/user/docker/containers/stats
- Portainer observability and alerting docs: https://docs.portainer.io/user/observability and https://docs.portainer.io/user/observability/alerting
- NGINX core module reference (`sendfile`, `sendfile_max_chunk`, `tcp_nopush`): https://nginx.org/en/docs/http/ngx_http_core_module.html
- `nginx-rtmp-module` directives: https://github.com/arut/nginx-rtmp-module/wiki/Directives
- `tiangolo/nginx-rtmp` image repository and Dockerfile: https://github.com/tiangolo/nginx-rtmp-docker and https://raw.githubusercontent.com/tiangolo/nginx-rtmp-docker/master/Dockerfile
- `jrottenberg/ffmpeg` image README: https://raw.githubusercontent.com/jrottenberg/ffmpeg/master/README.md

## Issues Found
- The original `transcode-worker` command wrapped the shell loop in extra quotes, which causes `/bin/sh -c` to treat the whole loop as a single command name instead of executing it. I removed the extra quoting and rewrote the loop into valid shell syntax.
- The original transcoding loop only watched `/input/pending.mp4` and always wrote `/output/output_720p.mp4`, which made the later scaling guidance incorrect and unsafe. I changed it to claim distinct `*.mp4` files, write per-file outputs, and move completed or failed jobs into separate directories.
- The post used `jrottenberg/ffmpeg:4.4-alpine`, while the upstream image documentation now lists current supported FFmpeg branches as `6.1`, `7.0`, and `7.1`. I updated the example to `jrottenberg/ffmpeg:7.1-alpine320`.
- The Compose example used the obsolete top-level `version` field. I removed it to match the current Compose specification.
- The stack examples mounted `./nginx.conf` and `./rtmp.conf`, but Portainer documents relative path volumes as a Portainer Business Edition feature for Git-deployed stacks. I replaced those with explicit host paths and clarified where the files should be saved.
- The origin `nginx.conf` included an `/hls/` location even though the origin container was not mounting HLS segment storage. I removed that block from the origin config and added a separate `rtmp.conf` that actually enables HLS in the streaming container.
- Step 3 referenced `rtmp.conf` but did not provide the configuration needed to expose HLS output. I added a minimal, working `rtmp.conf` based on the `nginx-rtmp-module` directives.
- The scaling instructions told the reader to use Portainer's `Duplicate/Edit` flow, which is container duplication, not Swarm service scaling. I replaced that with the documented Portainer service-scaling workflow and clarified that multi-node scaling needs shared storage or object storage instead of node-local volumes.
- The monitoring section implied that Portainer's basic container stats view can be used to "set alerts". Portainer's automated alerting is documented separately under observability and is Business Edition-only. I corrected the text to distinguish live stats from automated alerting.

## Review Notes
- The post is technically correct after the fixes above.
- The `tiangolo/nginx-rtmp:latest` tag is valid, but pinning to a dated image tag would make the example more reproducible.
- Portainer observability/alerting is currently a Business Edition feature, and the observability section is marked experimental in the current docs.
