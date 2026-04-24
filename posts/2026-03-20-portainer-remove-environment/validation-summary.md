# Validation Summary: How to Remove an Environment from Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Docker
- Docker Swarm
- Kubernetes
- `curl`

## Sources Consulted
- Portainer documentation, API documentation landing page: https://docs.portainer.io/api/docs
- Portainer documentation, API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer documentation, add an environment via the API: https://docs.portainer.io/admin/environments/add/api
- Portainer documentation, Environments: https://docs.portainer.io/2.27/admin/environments/environments
- Portainer documentation, Stacks: https://docs.portainer.io/user/docker/stacks
- Portainer documentation, How do I remove Portainer?: https://docs.portainer.io/faqs/installing/how-do-i-remove-portainer
- Portainer documentation, Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer documentation, Install Portainer Agent on Docker Swarm: https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer documentation, Install Portainer Agent on your Kubernetes environment: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer official source, auth handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/auth/authenticate.go
- Portainer official source, stack list handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_list.go
- Portainer official source, environment delete handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_delete.go

## Issues Found
- The Web UI removal steps were inaccurate. The current Portainer docs instruct users to remove environments from the **Environments** list by selecting the environment and clicking **Remove**, not by opening the environment settings page and clicking **Remove this environment**. The steps were updated to match the official docs.
- The stack-listing `curl` example passed the `filters` JSON directly in the URL. This was changed to `-G --data-urlencode` so the query parameter is encoded correctly and works reliably with `curl`.
- The standalone agent cleanup section incorrectly removed a non-standard volume named `portainer_agent_data`. Official Portainer agent deployment docs use bind mounts, and the Portainer removal docs do not include an agent data volume removal step. The incorrect volume removal command was removed.
- The Swarm cleanup command used the wrong service name. Portainer’s Swarm agent installation docs show the generated service as `portainer-agent_agent`, so the command was corrected.
- The Kubernetes cleanup section incorrectly used `helm uninstall portainer-agent -n portainer`. Current Portainer Kubernetes agent docs describe agent-only deployment via provided YAML manifests, and the official removal guidance is to delete the `portainer` namespace. The unsupported Helm uninstall command was removed.
- The post claimed that stack definitions are removed when an environment is deleted. Current Portainer docs state that stacks for deleted environments become orphaned and must be re-associated to be fully recovered. That explanation was corrected.
- The conclusion said environment removal is reversible. Portainer’s environment documentation explicitly says the action cannot be reversed, so the conclusion was corrected to reflect that while workloads keep running, the removal action itself is not reversible.

## Review Notes
- Portainer’s API still uses `/api/endpoints/...` even though the UI and docs use the term “environment”; this is expected and remains technically correct.
- Portainer documents the classic Portainer Agent on Docker Swarm and Kubernetes as a legacy option and recommends the Edge Agent for most new deployments.
