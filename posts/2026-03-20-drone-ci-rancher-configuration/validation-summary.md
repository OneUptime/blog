# Validation Summary: How to Configure Drone CI with Rancher - Configuration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Drone CI / Drone server
- Drone Kubernetes runner
- Rancher-managed Kubernetes
- Helm
- GitHub OAuth Apps
- Kubernetes RBAC and deployments
- Docker image publishing with Drone plugins
- `kubectl` deployment rollout commands

## Sources Consulted
- Drone GitHub provider installation docs: https://docs.drone.io/server/provider/github/
- Drone server configuration reference: https://docs.drone.io/server/reference/
- Drone server Helm chart README: https://raw.githubusercontent.com/drone/charts/master/charts/drone/README.md
- Drone server Helm chart values: https://raw.githubusercontent.com/drone/charts/master/charts/drone/values.yaml
- Drone Kubernetes runner installation docs: https://docs.drone.io/runner/kubernetes/installation/
- Drone Kubernetes runner overview: https://docs.drone.io/runner/kubernetes/overview/
- Drone Kubernetes runner configuration reference: https://docs.drone.io/runner/kubernetes/configuration/reference/
- Drone Kubernetes pipeline quick start: https://docs.drone.io/quickstart/kubernetes/
- Drone Kubernetes YAML reference: https://docs.drone.io/yaml/kubernetes/
- Drone trigger docs: https://docs.drone.io/pipeline/triggers/
- Drone substitution docs: https://docs.drone.io/pipeline/environment/substitution/
- Drone Docker plugin docs: https://docs.drone.io/plugins/popular/docker/
- Drone repository secret docs: https://docs.drone.io/secret/repository/
- Drone organization secret CLI docs: https://docs.drone.io/cli/orgsecret/drone-orgsecret-add/
- GitHub OAuth app docs: https://docs.github.com/en/developers/apps/creating-an-oauth-app

## Issues Found
- The server Helm values used `envFrom`, but the official `drone/drone` chart expects `extraSecretNamesForEnvFrom` for loading secret-backed environment variables. I replaced the key so the example matches the current chart.
- The runner section used an outdated Helm-based example and an incorrect in-cluster RPC endpoint. I replaced it with a manifest-based install aligned with the official runner docs, added the required service account and RBAC, and pointed the runner at `drone.drone.svc.cluster.local:8080`, which matches the Drone server service name and default chart port.
- The secrets section said organization secrets can be added from repository settings in the UI. Drone documents repository secrets in the repo settings UI, while organization secrets are created separately via CLI or API. I corrected the instructions and clarified the meaning of `kube_token` and `kube_server`.
- The best-practices section referenced Drone “branch protection” filters for secret safety. Drone’s documented default behavior is that repository secrets are not exposed to pull requests by default, so I replaced the inaccurate guidance.

## Review Notes
- The Drone Kubernetes runner is still documented as beta and community-supported in the official docs.
- The `.drone.yml` example uses `plugins/docker`; this depends on the cluster allowing privileged or nested-container workloads for Docker-in-Docker style image builds.
