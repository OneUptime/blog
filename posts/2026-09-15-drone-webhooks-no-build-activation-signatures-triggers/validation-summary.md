# Validation Summary: Drone Webhooks Arrive but No Build Starts: Check Repository Activation, Signatures, and Trigger Filters

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Drone CI/CD
- Drone CLI and pipeline YAML
- GitHub webhooks
- Gitea webhooks
- GitLab webhooks
- Reverse proxies and HMAC webhook authentication

## Sources Consulted
- Drone Docker pipeline quickstart: https://docs.drone.io/quickstart/docker/
- Drone `repo enable` command: https://docs.drone.io/cli/repo/drone-repo-enable/
- Drone `repo info` command: https://docs.drone.io/cli/repo/drone-repo-info/
- Drone `repo update` command and repository settings: https://docs.drone.io/cli/repo/drone-repo-update/
- Drone `repo repair` command: https://docs.drone.io/cli/repo/drone-repo-repair/
- Drone pipeline trigger syntax: https://docs.drone.io/pipeline/docker/syntax/trigger/
- Drone pipeline skip directives: https://docs.drone.io/pipeline/skipping/
- Drone system webhooks: https://docs.drone.io/webhooks/overview/
- GitHub webhook delivery validation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- Gitea webhook documentation: https://docs.gitea.com/usage/repository/webhooks
- GitLab webhook documentation: https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab project webhooks API: https://docs.gitlab.com/api/project_webhooks/

## Issues Found
No technical issues found.

## Review Notes
- The Drone CLI commands and YAML example match the official command and pipeline syntax documentation.
- The statements about combined trigger categories, pull-request target branches, tag events, glob matching, and skip-directive exceptions match Drone's documentation.
- GitLab signing tokens and the Standard Webhooks headers were introduced in GitLab 19.0 and coexist with the legacy `X-Gitlab-Token` mechanism. The post correctly advises readers to confirm that their installed Drone integration supports the selected authentication mode.
