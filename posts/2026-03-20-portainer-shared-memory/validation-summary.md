# Validation Summary: How to Set Shared Memory Size for Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker tmpfs mounts
- Chromium / Chrome Headless
- Puppeteer
- PostgreSQL
- PyTorch

## Sources Consulted
- Portainer Docs, "Add a new container": https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Docs, "Advanced container settings": https://docs.portainer.io/user/docker/containers/advanced
- Docker Docs, "Running containers": https://docs.docker.com/engine/containers/run/
- Docker Docs, "Services" Compose file reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "tmpfs mounts": https://docs.docker.com/engine/storage/tmpfs/
- Docker Docs, "`docker container stats`": https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Hub, PostgreSQL Official Image docs: https://hub.docker.com/_/postgres
- Docker Library Postgres README: https://github.com/docker-library/docs/tree/master/postgres/README.md
- PostgreSQL docs, "Resource Consumption / shared_buffers": https://www.postgresql.org/docs/current/runtime-config-resource.html
- Selenium Docker image docs, `selenium/standalone-chrome`: https://hub.docker.com/r/selenium/standalone-chrome
- Chrome for Developers, "Chrome Headless mode": https://developer.chrome.com/docs/chromium/headless
- Puppeteer docs, `LaunchOptions.args`: https://pptr.dev/api/puppeteer.launchoptions
- PyTorch docs, `torch.multiprocessing`: https://docs.pytorch.org/docs/stable/multiprocessing.html
- PyTorch docs, `torch.utils.data`: https://docs.pytorch.org/docs/stable/data.html

## Issues Found
- The Portainer navigation text said the shared-memory field was in a combined "Runtime & Resources" section. I changed it to match current Portainer docs: advanced container settings, then the `Runtime` section.
- The Puppeteer workaround example used `PUPPETEER_ARGS`, which Puppeteer does not consume automatically, and the `node:20-alpine` example did not actually provide Chrome. I replaced it with a correct Puppeteer launch snippet that passes `--disable-dev-shm-usage` through `launch({ args: [...] })`.
- The PostgreSQL example used a non-existent `POSTGRES_SHARED_BUFFERS` environment variable. I replaced it with the supported `postgres -c shared_buffers=128MB` form documented by the official Postgres image.
- The PostgreSQL explanation said `shm_size` must be at least as large as `shared_buffers`. I corrected this to the more accurate statement that `/dev/shm` must be large enough for PostgreSQL's shared-memory requirements, which include but are not limited to `shared_buffers`.
- The Apache Spark and generic FFmpeg/GStreamer subsections were removed because the post presented them as common `/dev/shm` requirements without a solid official basis for the exact Docker examples shown.
- The Compose `tmpfs` example used the service-level `tmpfs` short syntax with a `size` option. Current Docker Compose docs only document `mode`, `uid`, and `gid` there. I replaced it with the supported long-syntax `volumes` tmpfs mount that accepts `tmpfs.size` and `tmpfs.mode`.
- The verification example used `cat /proc/meminfo | grep Shmem` to check the configured `/dev/shm` size. That does not report the mount size, so I replaced it with `grep '/dev/shm' /proc/mounts`.
- The monitoring section claimed `docker stats` reports actual shared-memory usage per container. It reports total container memory usage instead, so I replaced that guidance with commands that inspect `/dev/shm` directly.
- The best-practices note implied that `shm_size` itself counts against the memory limit as a reservation. I corrected this to note that `shm_size` is a limit, while actual data written to `/dev/shm` consumes RAM.

## Review Notes
- The post still uses `docker-compose.yml` in an example comment. Current Docker docs prefer `compose.yaml`, but `docker-compose.yml` remains widely supported.
- The Selenium example uses the `latest` tag. It is technically valid, but version pinning would make the example more reproducible in the future.
