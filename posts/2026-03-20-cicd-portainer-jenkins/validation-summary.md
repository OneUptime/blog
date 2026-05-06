# Validation Summary: How to Set Up CI/CD with Portainer and Jenkins

## Status
validated

## Post Type
Guide

## Technologies Covered
- Jenkins
- Jenkins Declarative Pipeline
- Docker
- Portainer
- `curl`
- Groovy (`Jenkinsfile`)

## Sources Consulted
- Jenkins Pipeline Syntax: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Using Docker with Pipeline: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Credentials Binding Plugin step reference: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Docker CLI `login` reference: https://docs.docker.com/reference/cli/docker/login/
- Portainer service webhooks: https://docs.portainer.io/user/docker/services/webhooks
- Portainer stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Jenkins Email Extension plugin: https://plugins.jenkins.io/email-ext/
- Jenkins Generic Webhook Trigger plugin: https://plugins.jenkins.io/generic-webhook-trigger/
- Portainer service webhook handler source: https://github.com/portainer/portainer/blob/develop/api/http/handler/webhooks/webhook_execute.go
- Portainer stack webhook handler source: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/webhook_invoke.go

## Issues Found
- The prerequisites listed the HTTP Request plugin, but the Jenkinsfile did not use the `httpRequest` step. The post did use `emailext`, and the webhook-trigger example depends on the Generic Webhook Trigger plugin. I replaced the plugin list so it matches the actual code and example.
- The prerequisites did not mention that the Jenkins agent needs Docker and `curl`, or that `when { branch 'main' }` is intended for a multibranch Pipeline. I added those requirements so the example matches the Jenkins features it relies on.
- The credentials section documented `PORTAINER_WEBHOOK_URL`, but the Jenkinsfile used `PORTAINER_STAGING_WEBHOOK` and `PORTAINER_PROD_WEBHOOK`. I corrected the credential names to match the code.
- The production stage used `when { branch 'main' }` together with a stage-level `input`, but Jenkins evaluates `input` before `when` unless `beforeInput true` is set. That meant non-`main` branches could still be prompted for approval. I added `beforeInput true` to make the gate behave as described.
- The registry login used `docker login -p`, while Docker documents `--password-stdin` for non-interactive logins. I changed the shell step to use `--password-stdin`.
- The deployment and registry login shell steps interpolated secrets directly into Groovy strings. Jenkins recommends preferring shell-side environment expansion for credentials. I changed those steps to use shell expansion instead.
- The cleanup step said it cleaned up local Docker images, but it only removed the build-number tag and left the `latest` tag behind. I updated it to remove both tags.
- The webhook section incorrectly implied that Portainer triggers Jenkins in the reverse direction. Portainer’s documented webhook flow is inbound to Portainer. I reworded that section to describe Jenkins receiving a generic webhook with a JSON `tag` field instead.

## Review Notes
- Portainer’s documentation shows `?tag=...` as the supported way to redeploy with a different image tag, and the current Portainer server code returns an empty `204 No Content` response for both service and stack webhook execution paths.
- The Generic Webhook Trigger plugin documentation notes that, for non-multibranch pipeline jobs configured from a Jenkinsfile, the pipeline usually needs one initial run before the trigger configuration is applied.
