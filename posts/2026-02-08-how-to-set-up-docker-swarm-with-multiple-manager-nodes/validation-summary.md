# Validation Summary: How to Set Up Docker Swarm with Multiple Manager Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Swarm mode
- Swarm manager nodes and worker nodes
- Raft consensus and quorum
- Linux firewall tools (`ufw`, `firewalld`)
- Docker CLI commands for swarm administration

## Sources Consulted
- Docker Docs: How nodes work - https://docs.docker.com/engine/swarm/how-swarm-mode-works/nodes/
- Docker Docs: Raft consensus in swarm mode - https://docs.docker.com/engine/swarm/raft/
- Docker Docs: Administer and maintain a swarm of Docker Engines - https://docs.docker.com/engine/swarm/admin_guide/
- Docker Docs: Getting started with Swarm mode - https://docs.docker.com/engine/swarm/swarm-tutorial/
- Docker Docs: Join nodes to a swarm - https://docs.docker.com/engine/swarm/join-nodes/
- Docker Docs: Manage nodes in a swarm - https://docs.docker.com/engine/swarm/manage-nodes/
- Docker Docs: Manage swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Docker CLI help output for `docker swarm init`, `docker swarm join`, `docker swarm join-token`, `docker node update`, `docker node promote`, and `docker node demote`

## Issues Found
- The post said `docker swarm init` outputs two join tokens. Docker's default `swarm init` output includes the worker join command and tells the user to run `docker swarm join-token manager` to retrieve the manager join command. Updated the wording to match the actual CLI behavior.
- The prerequisite and firewall wording implied port 2377 must be open between every node. Docker documents TCP 2377 as the swarm control-plane port for communication with and between manager nodes, while TCP/UDP 7946 and UDP 4789 are needed between swarm nodes for discovery and overlay traffic. Updated the wording to clarify the scope.
- The monitoring section said the shown commands check the Raft log, but `docker info --format '{{.Swarm.Managers}}'` and `docker node inspect ... '{{.ManagerStatus}}'` inspect manager count/status rather than the Raft log itself. Updated the wording to match the commands.

## Review Notes
The Docker Swarm manager-count, quorum, Raft, promotion/demotion, join-token rotation, manager draining, and backup/restore guidance aligns with current Docker documentation. The leader election timing claim is operationally plausible but not stated as a formal guarantee in the official Docker docs, so it may vary by environment and Docker version.
