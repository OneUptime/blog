# Validation Summary: How to Deploy a Complete CI/CD Pipeline with Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Docker Compose
- Docker Registry
- Gitea
- Jenkins
- Jenkins Pipeline
- Jenkins Multibranch Pipeline
- Portainer GitOps webhooks and API
- Bash
- `curl`
- `jq`

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Jenkins Docker installation docs: https://www.jenkins.io/doc/book/installing/docker/
- Jenkins Pipeline syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Multibranch Pipeline docs: https://www.jenkins.io/doc/book/pipeline/multibranch/
- Jenkins Pipeline examples: https://www.jenkins.io/doc/pipeline/examples/
- Jenkins Gitea plugin docs: https://plugins.jenkins.io/gitea/
- Gitea configuration cheat sheet: https://docs.gitea.com/administration/config-cheat-sheet
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer CE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer stack creation and GitOps updates docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer automatic update behavior: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer force redeployment behavior: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/empty-relative-bind-mounts

## Issues Found
- Removed the obsolete top-level `version` key from the Compose example. Docker Compose now treats it as informative only and warns that it is obsolete.
- Reworked the Jenkins container setup. The original `jenkins/jenkins:lts` example mounted `/var/run/docker.sock` but did not provide a Docker CLI, which Jenkins’ own Docker docs call out as missing from the official image. I changed the example to use a custom Jenkins image plus a `docker:dind` sidecar, matching the documented pattern.
- Corrected the registry addressing model. The original `registry:5000` reference only worked inside the Compose network, not reliably from every Docker daemon involved in Jenkins and Portainer. I changed it to a resolvable hostname and added the HTTP/TLS caveat.
- Added the required Jenkins plugins and job type details. The post used `branch` conditions and the `mail` step but did not mention Multibranch Pipeline, the Gitea plugin, or Mailer. I updated the plugin list and clarified that the job should be a Multibranch Pipeline.
- Fixed image tag generation. The original Jenkinsfile built `IMAGE_TAG` from `GIT_COMMIT` in the top-level `environment` block, but Jenkins Pipeline examples note that Git plugin variables are not exposed there for Pipeline jobs. I moved the short commit calculation to the checkout stage using `git rev-parse --short=8 HEAD`.
- Corrected Gitea trigger guidance. The original step mixed a Jenkins context path of `/jenkins` with a webhook URL that omitted it, and it assumed manual hook setup without mentioning the documented Gitea plugin flow. I replaced it with the official Gitea plugin configuration and managed hooks approach.
- Corrected Portainer webhook and API usage. The original staging webhook call incorrectly added an API key to a public webhook URL and treated the saved credential as a path fragment instead of the full URL. The original production API call used an incomplete endpoint and deprecated or incorrect payload fields. I updated these to the documented webhook and `PUT /stacks/{id}/git/redeploy` patterns, including `endpointId` and `RepullImageAndRedeploy`.
- Corrected the Portainer GitOps explanation. Portainer only redeploys Git-based stacks automatically when the commit changes unless force redeployment is enabled. I added that requirement because the tutorial deploys by changing image tags.
- Rewrote the `deploy-to-portainer.sh` example. The original script attempted to send the entire stack metadata object back as `stackFileContent`, which does not match Portainer’s documented request schema. The fixed version updates the `IMAGE_TAG` environment variable and redeploys via the documented Git redeploy endpoint.
- Softened the conclusion’s infrastructure claim. The original text promised “no third-party dependencies” and “no data leaving your network,” which the tutorial does not strictly establish. I revised it to a narrower, technically supportable claim about keeping the workflow under your control.

## Review Notes
- The examples still use floating container tags such as `gitea/gitea:latest` and `jenkins/jenkins:lts-jdk21`. They are valid, but pinning specific versions would make the tutorial more reproducible.
- The registry example assumes either a trusted internal network with explicit insecure-registry configuration or a TLS front end. That caveat is now called out in the post.
