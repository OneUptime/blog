# Validation Summary: How to Automate Docker Builds and Deployments with Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Portainer API
- Docker
- Docker Hub
- Docker Swarm
- Bash
- `curl`
- `jq`
- `cron`

## Sources Consulted
- Portainer documentation: API documentation overview  
  https://docs.portainer.io/api/docs
- Portainer OpenAPI schema for stacks endpoints (`/stacks/{id}/git/redeploy`, `/stacks/webhooks/{webhookID}`, `X-API-KEY`)  
  https://api-docs.portainer.io/versions/ce/2.39.2/stacks.yaml
- Portainer documentation: Add a new stack / GitOps updates  
  https://docs.portainer.io/user/docker/stacks/add
- Portainer documentation: Stack webhooks  
  https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer documentation: How automatic updates for stacks/applications work  
  https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer documentation: Accessing the Portainer API  
  https://docs.portainer.io/2.21/api/access
- Docker documentation: Automated builds  
  https://docs.docker.com/docker-hub/repos/manage/builds/
- Docker documentation: Webhooks  
  https://docs.docker.com/docker-hub/repos/manage/webhooks/
- Docker documentation: `docker service logs`  
  https://docs.docker.com/reference/cli/docker/service/logs/
- Docker documentation: `docker image build` / `docker build --pull`  
  https://docs.docker.com/reference/cli/docker/image/build/

## Issues Found
- The post claimed Docker Hub needed a bridge service to trigger Portainer. I corrected this to a direct Docker Hub webhook → Portainer stack webhook flow because Portainer documents using the generated webhook URL directly in a registry integration.
- The mermaid diagram still showed a bridge service. I updated the diagram to match the corrected direct webhook flow.
- The automation script used `POST /api/stacks/$STACK_ID/images/update?pullImage=true`, which does not exist in the current Portainer OpenAPI schema. I replaced it with the documented Git-backed redeploy flow using `PUT /api/stacks/$STACK_ID/git/redeploy` and the current `RepullImageAndRedeploy` payload field.
- The script implied it worked for any stack type. I narrowed the wording so the example explicitly applies to stacks deployed from Git, which matches the endpoint used.
- The script used `docker build` without `--pull` while the post later claimed nightly rebuilds ensure base image security updates are applied. I added `--pull` so the claim is technically accurate.
- The token example used `x-api-key` and described tokens as separately scoped. I updated the example to use the documented `X-API-KEY` header and corrected the explanation to say access tokens inherit the permissions of the Portainer user that created them, while still being independently revocable.
- The logging example used `docker service logs --follow ... | head -50`, which is a poor fit for a streaming command and lacked Swarm context. I changed it to `docker service logs --follow --tail 50` and clarified that it applies to Docker Swarm stacks on a manager node.
- The shell script had a failure path where an empty stack lookup would cause `jq` to parse invalid input before reaching the intended error message. I adjusted the lookup so it fails cleanly with the explicit “stack not found” message.

## Review Notes
- The corrected API examples now assume a Git-backed Portainer stack. File-based stacks use different update mechanics in Portainer, so the current post should not be read as a generic file-based stack redeploy guide.
- Portainer’s current docs site mixes latest documentation pages with some versioned API access pages. The endpoint and header changes in this review were validated against the current Portainer 2.39.2 OpenAPI schema.
