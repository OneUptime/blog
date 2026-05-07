# Validation Summary: How to Automate Multi-Environment Deployments with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Compose
- GitHub Actions
- Bash
- Python 3
- CI/CD

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer stack list handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_list.go
- Portainer stack update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_update.go
- Portainer swarm stack create handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/create_swarm_stack.go
- Portainer swarm deployment implementation: https://github.com/portainer/portainer/blob/develop/api/exec/swarm_stack.go
- Docker Compose deploy reference: https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm stack deploy reference: https://docs.docker.com/engine/swarm/stack-deploy/
- GitHub Actions deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Actions deployment environments: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments
- Docker login GitHub Action: https://github.com/docker/login-action

## Issues Found
- The Portainer stack creation example used an outdated API shape (`/api/stacks?type=1&method=string&endpointId=...`). I updated it to the current swarm stack creation endpoint (`/api/stacks/create/swarm/string?endpointId=...`) and added the required `SwarmID` field.
- The stack lookup request embedded raw JSON directly in the URL query string. I changed it to `curl --get --data-urlencode` so the `filters` parameter is sent correctly.
- The deployment script only accepted an image tag and always deployed to dev, even though the example text showed staging and prod promotions. I fixed the script so the second argument selects `dev`, `staging`, or `prod`.
- The script created `APP_ENV` values of `dev` and `prod`, which did not match the table (`development`, `production`). I corrected the environment-specific values.
- The update payload only sent `IMAGE_TAG`, which would replace the stack's environment-variable set and drop `DB_HOST`, `LOG_LEVEL`, and `REPLICAS`. I changed the script and workflow examples to send the full environment-variable set on every update.
- The Portainer update examples omitted `StackFileContent`, but the current file-based stack update endpoint requires it. I updated both the script and GitHub Actions examples to include the Compose file content in the request body.
- The examples used `PullImage`, which is deprecated in current Portainer releases. I replaced it with `RepullImageAndRedeploy`.
- The GitHub Actions workflow pushed an image without first authenticating to the registry. I added a registry login step using the current `docker/login-action@v4`.
- The staging example sent a `PUT` request with no JSON body, and the production example did not deploy at all. I replaced both with complete, valid update calls.
- The workflow comments implied that `environment:` alone enforces manual approval. I corrected the wording to reflect GitHub's actual behavior: approval requires protection rules such as required reviewers on the GitHub environment.
- The Compose example uses `deploy.replicas`, which is a Swarm-oriented deployment setting. I clarified that the example assumes Docker Swarm environments so the scaling example matches the deployment flow.

## Review Notes
- The validated examples now assume file-based Portainer stacks deployed to Docker Swarm environments. Git-deployed stacks use a different Portainer update flow.
- Keeping `version: "3.8"` is appropriate for this Swarm-oriented example because `docker stack deploy` still uses the legacy Compose v3 stack format.
