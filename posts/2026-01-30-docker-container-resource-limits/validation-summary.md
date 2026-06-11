# Validation Summary: How to Implement Docker Container Resource Limits

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Docker Engine
- Docker CLI
- Linux cgroups v1 and v2
- Docker Compose
- Container CPU, memory, swap, OOM, and block I/O limits
- cAdvisor and Prometheus metrics
- JVM memory tuning in containers

## Sources Consulted
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Runtime metrics - https://docs.docker.com/engine/containers/runmetrics/
- Docker Docs: docker container run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Deprecated Docker Engine features - https://docs.docker.com/engine/deprecated/
- Local Docker CLI help output for `docker run`, `docker stats`, `docker inspect`, `docker events`, and `docker compose config`

## Issues Found
- The post showed `--kernel-memory` as a usable Docker run option. Docker deprecated kernel memory limits in Docker 20.10, removed support in Docker 23.0, and current Docker CLI documentation no longer lists the option. I replaced the runnable example with a note explaining that current Docker releases no longer support `--kernel-memory`.
- The cgroup verification example said Docker info output "should" show the systemd cgroup driver and cgroup v2. That is not universally true across valid Docker installations. I changed the wording to say that this is output a cgroups v2 host may show.
- The OOM killer section implied `--oom-kill-disable` works generally. Docker's runtime metrics documentation notes that this flag is discarded on cgroups v2. I added that cgroups v2 caveat.
- The block I/O section described 500 as the default for `docker run --blkio-weight`. Docker's CLI reference describes valid values as 10-1000, or 0 to disable, with default 0. I updated the wording to make 0 the disabled/unset value and 500 a neutral weight.
- The Docker Compose introduction incorrectly referred to "`resources` under services." Compose uses service-level resource keys such as `mem_limit` and `cpus`, plus `deploy.resources`. I corrected the wording.
- The Compose examples used the obsolete top-level `version: '3.8'` key, which current Docker Compose ignores with a warning. I removed the `version` lines from the Compose snippets.
- The Compose run command used the legacy standalone `docker-compose` command. I updated it to the current Compose v2 form, `docker compose up -d`.

## Review Notes
The Docker Compose YAML snippets were validated with `docker compose -f - config --quiet` after edits. The resource-limit commands and flags were cross-checked against Docker's official CLI reference and local CLI help. Some examples still depend on host-specific details, such as actual block device names and cgroup paths, which the post already frames as debugging examples.
