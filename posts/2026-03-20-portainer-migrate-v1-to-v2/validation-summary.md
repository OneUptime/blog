# Validation Summary: How to Migrate Portainer from Version 1.x to 2.x - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Swarm
- Portainer Agent / Edge Agent
- Kubernetes

## Sources Consulted
- Portainer docs: Updating from Portainer 1.x - https://docs.portainer.io/2.27/start/upgrade/from-1.x
- Portainer docs: Updating on Docker Standalone - https://docs.portainer.io/start/upgrade/docker
- Portainer docs: Updating on Docker Swarm - https://docs.portainer.io/sts/start/upgrade/swarm
- Portainer docs: Install Portainer CE with Docker on Linux - https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer docs: Install Portainer Agent on Docker Swarm - https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer docs: What does Portainer's backup include? - https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer docs: Lifecycle policy - https://docs.portainer.io/start/lifecycle
- Portainer 1.x docs: Deployment - https://portainer.readthedocs.io/en/stable/deployment.html
- Portainer 1.x docs: Agent - https://portainer.readthedocs.io/en/latest/agent.html

## Issues Found
- The post described migration as a parallel fresh install with a new `portainer2_data` volume. Official Portainer guidance uses an in-place upgrade that reuses the existing `/data` volume. I rewrote the process around the documented `1.x -> 1.24.2 -> 2.0.0 -> current 2.x` sequence.
- The original commands used `portainer/portainer-ce:latest`, which skips the required intermediary upgrade to `2.0.0` and is not the supported path from 1.x. I replaced the commands with the documented versioned upgrade flow and current `:lts` update step.
- The post claimed users, environments, stacks, templates, and configuration had to be recreated manually. Portainer upgrades the existing database in place, and Portainer's own backup documentation shows that users, environments, stack definitions created in Portainer, registries, templates, and settings are part of the stored configuration. I corrected the migration and reconfiguration sections accordingly.
- The comparison table said Portainer 1.x had no HTTPS support and no agent-based Swarm option. Portainer 1.x documentation shows SSL on port `9000` was supported and the Portainer Agent already existed for Swarm. I replaced the inaccurate rows with a narrower, documented comparison.
- The Swarm Agent example command was incomplete and outdated, and it presented agent deployment in an overly rigid way. I removed the stale manual command and pointed readers to the current Add Environment wizard and generated Agent or Edge Agent instructions.
- The decommission step deleted the original Portainer data volume after a side-by-side install. Because the supported upgrade path reuses the existing data volume, deleting it would destroy the Portainer database. I replaced that guidance with a warning not to delete the volume until validation is complete and backups are confirmed.
- The post treated `9443` as the universal 2.x access port. Official docs show `2.0.0` still used `9000`, while current 2.x releases default to `9443`. I corrected the port guidance and validation steps.
- The commands were CE-specific despite the post's generic wording. I added a note that Business Edition migrations should use the matching BE image and Portainer's BE upgrade or switch guidance.

## Review Notes
- Current Portainer guidance recommends keeping Portainer Server and Agent or Edge Agent versions aligned. The post now calls this out explicitly.
- The post now uses `:lts` instead of `:latest` to avoid an unpinned upgrade target in a migration guide.
- Current Portainer releases default to HTTPS on `9443`; `9000` is optional legacy HTTP access and may require corresponding reverse proxy and firewall updates.
