# Validation Summary: How to Back Up Docker Swarm Cluster State

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Docker Engine
- Docker Swarm mode
- Swarm manager Raft state
- Docker services
- Docker secrets and configs
- Docker overlay networks
- Bash backup and restore scripts

## Sources Consulted
- Docker Docs: Administer and maintain a swarm of Docker Engines - https://docs.docker.com/engine/swarm/admin_guide/
- Docker Docs: Raft consensus in swarm mode - https://docs.docker.com/engine/swarm/raft/
- Docker Docs: Manage sensitive data with Docker secrets - https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: Store configuration data using Docker Configs - https://docs.docker.com/engine/swarm/configs/
- Docker Docs: docker service create CLI reference - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker config inspect CLI reference - https://docs.docker.com/reference/cli/docker/config/inspect/
- Docker Docs: docker swarm init CLI reference - https://docs.docker.com/reference/cli/docker/swarm/init/
- Local Docker CLI help output from Docker 29.4.2 for `docker service create`, `docker node update`, `docker network create`, `docker secret inspect`, `docker config inspect`, `docker swarm init`, and `dockerd`.

## Issues Found
- The post described the drain-based backup as "non-disruptive" and implied it created a consistent snapshot. Docker's official guidance says hot backups are possible but not recommended and are less predictable to restore. Changed the section to "Hot Backup Method" and clarified that draining only moves service tasks away before a hot backup.
- The drain script comment said it locked the swarm. `docker node update --availability drain` does not lock the swarm or stop Raft writes. Updated the comment to describe the actual hot backup behavior.
- The service export script did not preserve global service mode, so generated commands could recreate global services as replicated services. Added mode detection and `--mode global` output for global services.
- The service export text claimed the generated commands were fully recoverable. The helper is useful, but it does not cover every service option. Updated the wording to "basic recreate commands" while preserving the JSON export as the complete service record.
- The secrets/configs section implied config values are encrypted like secrets. Docker configs are intended for non-sensitive data and are not encrypted like secrets. Updated the wording to distinguish Docker secrets from Docker configs.
- The complete backup script took a hot Raft backup after draining the node. Docker recommends stopping Docker before backing up `/var/lib/docker/swarm`. Updated the script to stop Docker before archiving the Raft state and restart it afterward.
- The restore script used `sudo dockerd --force-new-cluster`, but `--force-new-cluster` is a `docker swarm init` option, not a `dockerd` daemon option. Updated the restore flow to start Docker and then run `docker swarm init --force-new-cluster`.
- Added an autolock restore note because Docker's Swarm admin guide states that auto-locked swarms require the unlock key during restore.

## Review Notes
The backup and manual recreation scripts are reasonable operational examples, but the generated service recreation commands remain intentionally basic. The exported `docker service inspect`, `docker network inspect`, `docker secret inspect`, and `docker config inspect` JSON files are the more complete recovery records.
