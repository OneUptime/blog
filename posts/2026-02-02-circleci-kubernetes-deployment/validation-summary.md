# Validation Summary: How to Deploy to Kubernetes from CircleCI

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- CircleCI (config 2.1, orbs, workflows, contexts, approval gates)
- Kubernetes (Deployment, Service, rolling updates, probes, secrets, namespaces)
- Docker (build, push, layer caching, remote docker)
- kubectl (install, rollout, set image, wait, apply)
- AWS EKS / ECR (aws-cli orb, `aws eks update-kubeconfig`, ECR login)
- Google GKE (gcloud SDK install, `gcloud container clusters get-credentials`)
- Azure AKS (Azure CLI, `az aks get-credentials`)
- CircleCI orbs: circleci/kubernetes@1.3.1, circleci/docker@2.5.0, circleci/aws-cli@4.1.2, circleci/slack@4.12.5
- Mermaid diagrams (flowchart, sequenceDiagram)
- Bash scripting in CI

## Sources Consulted
- CircleCI AWS CLI orb source (commands/setup.yml): https://github.com/CircleCI-Public/aws-cli-orb (confirmed parameter names `role_arn` and `role_session_name` use underscores, not hyphens)
- CircleCI Developer Hub - circleci/aws-cli orb: https://circleci.com/developer/orbs/orb/circleci/aws-cli
- CircleCI Docs - Run Docker commands / setup_remote_docker: https://circleci.com/docs/guides/execution-managed/building-docker-images/
- CircleCI Discuss - Default Docker Version Updated to Docker 24: https://discuss.circleci.com/t/default-docker-version-for-remote-docker-jobs-updated-to-docker-24/49689
- CircleCI Slack orb docs: https://circleci.com/docs/guides/getting-started/slack-orb-tutorial/ and https://github.com/CircleCI-Public/slack-orb (confirmed event values `pass`/`fail` and template `basic_fail_1`)
- CircleCI Kubernetes orb: https://github.com/CircleCI-Public/kubernetes-orb
- Kubernetes official kubectl install docs: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/ (confirmed `https://dl.k8s.io/release/...` URLs and SHA-256 verification command)
- AWS CLI docs - `aws eks update-kubeconfig`: confirmed flag names `--name` and `--region`
- AWS CLI docs - `aws ecr get-login-password`: confirmed syntax
- Google Cloud SDK install script: https://sdk.cloud.google.com (confirmed install + `path.bash.inc` source)
- `gcloud container clusters get-credentials` documentation
- Azure CLI `az aks get-credentials` and `az login --service-principal` documentation
- Kubernetes Deployment / Service / Probe / RollingUpdate spec API reference (apps/v1)

## Issues Found
1. **Incorrect parameter names for the `aws-cli/setup` step (EKS section).** The post used hyphenated parameter names (`role-arn`, `role-session-name`) for the `circleci/aws-cli@4.1.2` orb. The orb actually defines these parameters with underscores (`role_arn`, `role_session_name`) — CircleCI orb parameter names must match exactly, so the hyphenated form would fail config validation. Fixed by changing `role-arn` → `role_arn` and `role-session-name` → `role_session_name` in the EKS deploy job.

## Review Notes
- The orb pins (`circleci/kubernetes@1.3.1`, `circleci/docker@2.5.0`, `circleci/aws-cli@4.1.2`, `circleci/slack@4.12.5`) are all valid published versions. Newer majors exist (e.g. aws-cli@5.x, kubernetes@2.x) at the time of review; the pinned versions still work but readers may want to upgrade to current majors in the future.
- `setup_remote_docker` with `version: docker24` is valid; `default` is also valid and is the recommended modern choice. Docker 24 has been CircleCI's default since the late-2023 update — no fix needed but worth noting.
- The image-tag-passing pattern uses both `$BASH_ENV` (within a job) and a workspace file `/tmp/image-tag.txt` (across jobs). Both are correct CircleCI patterns; `$BASH_ENV` would not survive across jobs, which is exactly why the workspace file is used.
- The `gcloud` install via `curl -sSL https://sdk.cloud.google.com | bash` followed by `source ~/google-cloud-sdk/path.bash.inc` is still functional. Google has moved toward apt/yum/snap packages as the recommended path, but the shell-script installer remains supported.
- `kubectl rollout history ... | tail -2 | head -1 | awk '{print $1}'` to capture the current revision works but is fragile (depends on output formatting); the captured `CURRENT_REVISION` variable is also not actually used downstream since `kubectl rollout undo` defaults to the previous revision. Functionally correct, just suboptimal — left as-is since it is not technically wrong.
- The SHA verification block uses `echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check` — this is the exact command shown in the official Kubernetes install docs and is correct (two spaces between the checksum and filename).
- The Slack `custom` block uses Slack Block Kit JSON and the orb correctly substitutes `<< parameters.environment >>` outside of the JSON-escaped context; this is fine for the orb but readers should know parameter substitution happens at config-compile time, not at runtime.
