# Validation Summary: How to Fix Duplicate Resources Appearing with Agent Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Agent
- Docker Standalone
- Docker CLI

## Sources Consulted
- Portainer documentation: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer documentation: Connect to the Docker Socket - https://docs.portainer.io/admin/environments/add/docker/socket
- Portainer documentation: Environments - https://docs.portainer.io/2.27/admin/environments/environments
- Portainer documentation: Why has my Environment IP not updated after I changed it? - https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/why-has-my-environment-ip-not-updated-after-i-changed-it
- Portainer documentation: How do I change the way I connect to an environment without losing my existing stacks? - https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/how-do-i-change-the-way-i-connect-to-an-environment-without-losing-my-existing-stacks
- Docker documentation: docker container ls - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker documentation: docker container stop - https://docs.docker.com/reference/cli/docker/container/stop/
- Docker documentation: Filter commands - https://docs.docker.com/engine/cli/filter/

## Issues Found
- The description and introduction overstated the cause as "snapshot conflicts" and implied that duplicates broadly come from multiple agent instances alone. I changed this to the documented cases: the same Docker host being added more than once, and stale environment details after an address change.
- The agent-check command used `docker ps | grep portainer_agent`, which depends on a specific container name and is less reliable than checking the image column. I changed it to `docker ps --format '{{.ID}}\t{{.Names}}\t{{.Image}}' | grep 'portainer/agent'` and scoped the step to Docker Standalone.
- The environment removal instructions did not match the current Portainer UI. I updated the step to select the duplicate environment and click `Remove`, which matches the current Environments documentation.
- The restart section claimed Portainer would rebuild snapshots for all environments after restart. Portainer's documentation specifically supports restarting the Portainer Server container when an Agent environment's updated IP does not apply correctly, so I narrowed the claim to that documented scenario.
- The post mixed older "endpoint" wording with current Portainer "environment" wording in the body. I updated the affected instructions to use current terminology where it changed the technical meaning.

## Review Notes
- Portainer currently describes both direct Docker socket connections and the traditional Portainer Agent on Docker Standalone as legacy options, and recommends the Edge Agent for most use cases.
- If a user removes and then re-adds an environment to change connection method, Portainer-managed stacks can become orphaned and may need to be re-associated afterward.
