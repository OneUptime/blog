# Validation Summary: How to Deploy StackStorm via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- StackStorm
- Docker Compose
- Docker
- MongoDB
- RabbitMQ
- Redis
- Slack ChatOps
- YAML
- StackStorm CLI

## Sources Consulted
- StackStorm Docker installation docs: https://docs.stackstorm.com/install/docker.html
- StackStorm system requirements: https://docs.stackstorm.com/install/system_requirements.html
- StackStorm quick start and CLI examples: https://docs.stackstorm.com/start.html
- StackStorm rules documentation: https://docs.stackstorm.com/rules.html
- StackStorm packs documentation: https://docs.stackstorm.com/packs.html
- StackStorm authentication and API keys: https://docs.stackstorm.com/authentication.html#api-keys
- StackStorm ChatOps overview: https://docs.stackstorm.com/chatops/chatops.html
- Official `st2-docker` repository README: https://github.com/StackStorm/st2-docker
- Official `st2-docker` compose and config files: https://github.com/StackStorm/st2-docker/blob/master/docker-compose.yml
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer relative path volume docs: https://docs.portainer.io/advanced/relative-paths

## Issues Found
- The original post used an unsupported single-container StackStorm deployment (`stackstorm/stackstorm`) with ad hoc MongoDB, Redis, and RabbitMQ wiring. I replaced Step 1 with the official `StackStorm/st2-docker` deployment flow because StackStorm's supported Docker installation is the multi-container `st2-docker` stack.
- The original environment variables (`ST2_PASSWORD` and `RABBITMQ_PASSWORD`) did not match the official StackStorm Docker deployment. I replaced them with the supported `st2-docker` variables, including `ST2_EXPOSE_HTTP` and the documented optional Slack ChatOps settings.
- The original Portainer instructions implied the stack could be pasted directly into the web editor. I corrected this to Portainer's Git repository deployment flow and documented the relative path volume requirement from Portainer because the upstream StackStorm compose file relies on repo-relative bind mounts.
- The original UI instructions pointed readers to `https://<host>` and custom credentials, but the official StackStorm Docker deployment exposes HTTP on port 80 by default and ships with `st2admin` / `Ch@ngeMe` unless `files/htpasswd` is changed. I updated Step 3 accordingly.
- The original CLI examples targeted a nonexistent all-in-one `stackstorm` container. I updated them to use the `st2client` container from the official deployment and added the documented `st2 apikey create` command for optional ChatOps setup.
- The original rule deployment copied files into `/opt/stackstorm/rules/`, which is not the documented pattern used here. I simplified the example to create the rule inside the `st2client` container and deploy it with `st2 rule create`, which matches the CLI documentation.
- The original conclusion said Redis was used for result caching and said packs bundle triggers. I corrected this to Redis for coordination in the Docker deployment, and to packs bundling sensors, actions, rules, workflows, and aliases.
- The original introduction described current ChatOps support as Slack/Teams. I narrowed this to Slack so the wording matches the current official ChatOps support documentation.

## Review Notes
- This post now follows StackStorm's official Docker deployment path, but that path requires Portainer Business Edition if you want Portainer to resolve the upstream compose file's relative bind mounts directly from Git.
- `ST2_VERSION=latest` is left as an optional override because that matches the official `st2-docker` default behavior. For stricter reproducibility, a fixed image tag would be safer in a future revision.
- The official `st2-docker` README describes this deployment as a quick way to get started and explicitly notes that it is not designed for production use.
