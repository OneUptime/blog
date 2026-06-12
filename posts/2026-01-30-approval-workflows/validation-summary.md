# Validation Summary: How to Create Approval Workflows

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitHub Actions environments and required reviewers
- GitLab CI/CD manual jobs, protected environments, and deployment approvals
- Docker image build and push workflow
- Kubernetes `kubectl set image` and rollout verification
- Argo CD applications, sync policies, sync windows, and CLI commands
- Slack Bolt for JavaScript and Block Kit buttons

## Sources Consulted
- GitHub Docs: Managing environments for deployment - https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment
- GitHub Docs: Deploying to a specific environment - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/deploy-to-environment
- GitLab Docs: Control how jobs run - https://docs.gitlab.com/ci/jobs/job_control/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Deployment approvals - https://docs.gitlab.com/ci/environments/deployment_approvals/
- GitLab Docs: Deprecated keywords - https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- Docker Docs: Build, tag, and publish an image - https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/
- Kubernetes Docs: `kubectl set image` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Docs: `kubectl rollout status` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Argo CD Docs: Automated Sync Policy - https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Docs: Sync Windows - https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Docs: `argocd app sync` command reference - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Slack Developer Docs: Bolt for JavaScript commands - https://docs.slack.dev/tools/bolt-js/concepts/commands
- Slack Developer Docs: Bolt for JavaScript actions - https://docs.slack.dev/tools/bolt-js/concepts/actions
- Slack Developer Docs: Actions block - https://docs.slack.dev/reference/block-kit/blocks/actions-block

## Issues Found
- The GitHub Actions example built `myapp:${{ github.sha }}` but pushed and deployed `myregistry/myapp:${{ github.sha }}`. Updated the Docker build tag so the image being pushed matches the image being built.
- The GitLab manual approval job used `when: manual` without `allow_failure: false`, which makes the manual job optional by default when defined outside `rules`. Added `allow_failure: false` so the approval gate blocks later stages until it is run successfully.
- The GitLab example used deprecated `only` syntax and described it as limiting which users can trigger the job. Replaced it with `rules` for the default branch and removed the incorrect user-access implication from the YAML comments.
- The GitLab `resource_group` comment said protected environments add an approval layer at that line. `resource_group` serializes deployments; protected environment approvals come from the environment configuration. Updated the comment.
- The Slack bot example referenced `generateId()` but did not define it. Added a simple ID generator.
- The Slack bot included a Reject button but no reject action handler. Added a handler that marks the request as rejected and updates the Slack message.
- The Slack bot text described designated approvers, but the code allowed any non-requester to approve. Added an allowlist based on `SLACK_APPROVER_IDS` and checked it for approve and reject actions.

## Review Notes
- The Argo CD sync-window example is structurally consistent with current documentation. In practice, teams should be explicit about whether `manualSync` is intended to permit or block human-triggered syncs during a deny window.
- GitHub environment required reviewers can be configured so only one required reviewer is needed to approve a job. Teams that need all listed reviewers to approve should not assume GitHub's built-in environment rule provides multi-approver consensus by itself.
