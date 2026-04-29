# Validation Summary: How to Use Jenkins Pipelines to Deploy to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Jenkins Declarative Pipeline
- Jenkins Credentials Binding
- Portainer API
- Portainer stack webhooks
- Docker
- Docker Compose / Portainer stack YAML
- `curl`
- `jq`

## Sources Consulted
- Jenkins Pipeline syntax: https://www.jenkins.io/doc/book/pipeline/syntax/
- Using a Jenkinsfile: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Jenkins credentials guide: https://www.jenkins.io/doc/book/using/using-credentials/
- Jenkins Docker installation guide: https://www.jenkins.io/doc/book/installing/docker/
- Credentials Binding Plugin steps: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Docker Compose version field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `login` reference: https://docs.docker.com/reference/cli/docker/login/
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer account settings and access tokens: https://docs.portainer.io/user/account-settings
- Portainer stack webhooks: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer CE 2.39.1 API spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml

## Issues Found
- Removed the top-level Compose `version` field from the Portainer stack YAML because Docker now treats it as obsolete and only keeps it for backward compatibility.
- Corrected the Jenkins controller note to reflect that mounting `docker.sock` is not sufficient by itself: the official `jenkins/jenkins` image does not include the Docker CLI, so Docker-capable agents or an image with Docker CLI installed are required.
- Replaced `IMAGE_TAG = "${env.GIT_COMMIT[0..7]}"` with a post-checkout `git rev-parse --short=8 HEAD` step, because Jenkins Git environment variables are assigned after checkout and are not reliable for top-level initialization before SCM checkout.
- Reworked the Portainer staging deployment example to use a documented access-token flow (`X-API-Key`) and the current file-based stack update API instead of the undocumented `/api/stacks/{id}/images/update` call that is not present in the current Portainer CE 2.39.1 API spec.
- Fixed insecure Groovy interpolation of secrets in `sh` steps by switching secret-bearing shell commands to single-quoted Groovy strings with shell expansion, matching Jenkins’ credential-handling guidance.
- Added the missing Jenkins credential definitions implied by the pipeline (`registry-credentials`, `portainer-api-key`, and `portainer-prod-webhook`) so the example is complete.
- Updated the webhook examples in the parallel deployment snippet to use safer single-quoted `sh` strings and fail-fast `curl` flags.

## Review Notes
- The staging API example now correctly assumes a file-based Portainer stack. Git-backed stacks can also be deployed through Portainer using stack webhooks or the Git redeploy API.
- Mounting `/var/run/docker.sock` gives the Jenkins container broad control over the host Docker daemon. The post is technically correct after the fixes, but this remains an operational security tradeoff.
