# Validation Summary: How to Configure Edge Agent Poll Frequency - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Docker `docker run` deployment
- Python 3

## Sources Consulted
- Portainer docs: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer docs: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/sts/admin/environments/add/docker/edge
- Portainer docs: Install Edge Agent Async on Docker Standalone - https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer docs: Edge Compute settings - https://docs.portainer.io/sts/admin/settings/edge
- Portainer docs: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer agent source: official environment variable list - https://github.com/portainer/agent
- Portainer server source: generated Edge Agent deployment commands and interval selectors - https://github.com/portainer/portainer

## Issues Found
- The post described `EDGE_POLL_INTERVAL`, `EDGE_PING_INTERVAL`, `EDGE_CMD_INTERVAL`, and `EDGE_SNAPSHOT_INTERVAL` as supported agent environment variables. These variables do not exist in the official Portainer agent or server code, so I replaced those instructions with the correct Portainer-side configuration flow.
- The original `docker run` examples would not work as real Edge Agent deployments because they omitted the required Docker socket, volume, host, and data mounts. I replaced them with valid Docker Standalone deployment commands based on Portainer's generated command format.
- The original examples used `portainer/agent:latest`. Portainer recommends matching the agent version to the Portainer Server version, so I changed the examples to use `portainer/agent:$PORTAINER_VERSION`.
- Async mode was presented as a general feature with agent-side interval env vars. Portainer documents async mode as a Business Edition feature, and its Ping, Snapshot, and Command intervals are configured in Portainer, not in the container environment. I corrected that description.
- The async example command also had invalid shell syntax because comments followed line-continuation backslashes. Replacing the command removed that syntax error.
- The interval guide used async values like 5 seconds, 30 seconds, and 300 seconds that are not offered by Portainer's current async interval selectors. I updated the table to use supported values.
- The "Updating Poll Interval on Running Agent" section incorrectly said you must stop and recreate the container to change intervals. I corrected this to the supported flow: edit the environment in Portainer and save the new interval settings.
- The bandwidth section used undocumented payload-size assumptions. I replaced it with a calculation based on Portainer's documented figure of roughly 324 bytes per second per agent at the default 5-second standard polling interval.

## Review Notes
- The example Docker commands target Docker Standalone on Linux. Swarm and Kubernetes Edge Agent deployments use different generated commands.
- The `PORTAINER_VERSION` shell variable in the examples is intentional. Portainer's documentation recommends matching the agent image version to the Portainer Server version rather than using `latest`.
