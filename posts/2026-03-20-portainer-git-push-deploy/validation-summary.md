# Validation Summary: How to Set Up Automated Stack Deployment on Git Push with Portainer - Deploy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- GitHub Actions
- GitLab CI/CD
- GitOps
- CI/CD webhooks

## Sources Consulted
- Portainer docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer docs, Stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer docs, How do automatic updates for stacks/applications work?: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer docs, API documentation: https://docs.portainer.io/api/docs
- Portainer OpenAPI spec (CE 2.39.1): https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker docs, `docker login`: https://docs.docker.com/reference/cli/docker/login/
- Docker docs, `docker image tag`: https://docs.docker.com/engine/reference/commandline/tag/
- Docker docs, `docker image push`: https://docs.docker.com/reference/cli/docker/image/push/
- Docker docs, Push images to Docker Hub: https://docs.docker.com/docker-hub/repos/manage/hub-images/push/

## Issues Found
- The Portainer stack webhook path was incorrect. The post used `/api/webhooks/...`, but Portainer stack webhooks use `/api/stacks/webhooks/...`. I corrected the endpoint in the manual example and the CI examples.
- The webhook section did not mention Portainer’s edition and environment limits. Official docs state stack webhooks are available in Portainer Business Edition and only on non-Edge environments. I added that constraint where the webhook method is introduced and reflected it in the introduction/conclusion wording.
- The Method 1 UI labels were outdated. I updated the snippet to use current Portainer terminology such as `Git Repository`, `Compose path`, `GitOps updates`, `Mechanism`, and `Fetch interval`, plus the current authentication labels.
- The GitHub Actions image push example used `myapp:<tag>` without a namespace, which would target Docker Hub’s default `library` namespace instead of a user-owned repository. I changed it to use a namespaced image reference and updated the login command to the documented non-interactive `--password-stdin` form.
- The GitHub Actions deployment step claimed it updated the stack to a new image tag but only POSTed to the webhook URL without passing a tag. I corrected it to use Portainer’s documented `?tag=` webhook parameter so the deployed image tag matches the current commit SHA.
- The GitLab CI example was under the webhook-based method but actually updated the stack through the file-stack API instead. I replaced it with a webhook-based deployment example that matches the section and uses Portainer’s documented stack webhook behavior.
- The Portainer API payload in Method 3 used the wrong field names and values. I changed `ComposeFilePathInRepository` to `ComposeFile`, and replaced the invalid boolean `AutoUpdate.Webhook` value with a valid polling-based `AutoUpdate` configuration using `Interval` and `ForcePullImage`.
- The rollback example used the wrong Portainer update approach and built invalid JSON for `StackFileContent`. I replaced it with a webhook-based rollback to the previously deployed commit tag, which matches the corrected deployment flow.

## Review Notes
- The webhook-based examples assume the stack’s image repository stays constant and Portainer only needs to switch tags, which matches Portainer’s documented `?tag=` webhook behavior.
- The rollback example assumes the image for `github.event.before` still exists in the registry. If an image retention policy deletes old commit-tagged images, that rollback approach would need an alternative source of the last known-good tag.
