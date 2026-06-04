# Validation Summary: How to Build a Drone CI Pipeline That Deploys to Multiple Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Drone CI server, Docker runner, pipeline YAML, secrets, conditions, promotions, templates, and CLI
- Kubernetes kubectl, kubeconfig, ServiceAccounts, RBAC, rollout status, and rollback
- Helm upgrade/install deployments
- Docker Compose
- Slack and Docker Drone plugins

## Sources Consulted
- Drone GitHub server installation: https://docs.drone.io/server/provider/github/
- Drone Docker runner installation: https://docs.drone.io/runner/docker/installation/linux/
- Drone repository secrets and CLI secret add: https://docs.drone.io/secret/repository/ and https://docs.drone.io/cli/secret/drone-secret-add/
- Drone Docker pipeline steps, conditions, triggers, parallelism, environment substitution, templates, logs, and promotions: https://docs.drone.io/pipeline/docker/syntax/steps/, https://docs.drone.io/pipeline/conditions/, https://docs.drone.io/pipeline/docker/syntax/trigger/, https://docs.drone.io/pipeline/docker/syntax/parallelism/, https://docs.drone.io/pipeline/environment/substitution/, https://docs.drone.io/template/yaml/, https://docs.drone.io/cli/drone-log/, and https://docs.drone.io/promote/
- Kubernetes kubectl generated reference for service account tokens, roles, and rollout status: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_role/, and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- Removed the obsolete top-level Docker Compose `version` key and updated `docker-compose up -d` to the current `docker compose up -d` command.
- Replaced the broad `cluster-admin` ClusterRoleBinding example with namespace-scoped RBAC and a namespaced service account token, because the text claimed this was the more secure pattern.
- Added Drone `depends_on` relationships so the production cluster deployments actually run in parallel after the Docker image build instead of running sequentially.
- Added `promote` to the pipeline trigger events so production promotion steps can run under the shown trigger.
- Replaced the Helm example's dynamic `from_secret: kubeconfig_${CLUSTER}` and undeclared variables with concrete per-cluster values, because Drone secret names are resolved from the YAML configuration.
- Replaced Bash brace expansion in the curl health-check loop with POSIX shell syntax, matching how Drone converts commands to shell scripts.
- Rewrote the Drone template example to match official YAML template syntax using `kind: template`, `load`, `data`, and Go template input references.
- Fixed the Drone log command to include both stage and step arguments.

## Review Notes
- The examples remain illustrative and require real repository names, cluster contexts, namespaces, registry credentials, and Drone secrets.
- The scoped Kubernetes RBAC example is appropriate for the `kubectl set image` / `rollout status` flow shown; broader permissions may be needed for pipelines that run `kubectl apply` against arbitrary manifests.
