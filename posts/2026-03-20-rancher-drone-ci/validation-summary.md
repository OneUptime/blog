# Validation Summary: How to Configure Drone CI with Rancher - Part 3

## Status
validated

## Post Type
Guide

## Technologies Covered
- Drone CI
- Rancher
- Kubernetes
- Helm
- GitHub OAuth Apps
- Drone CLI

## Sources Consulted
- Drone GitHub provider installation docs: https://docs.drone.io/server/provider/github/
- Drone server database reference: https://docs.drone.io/server/reference/drone-database-datasource/
- Official Drone Helm charts repository: https://github.com/drone/charts
- Drone server chart values: https://raw.githubusercontent.com/drone/charts/master/charts/drone/values.yaml
- Drone server chart README: https://raw.githubusercontent.com/drone/charts/master/charts/drone/README.md
- Deprecated Kubernetes runner chart README: https://raw.githubusercontent.com/drone/charts/master/charts/drone-runner-kube/README.md
- Drone Kubernetes runner installation docs: https://docs.drone.io/runner/kubernetes/installation/
- Drone Kubernetes runner resource configuration docs: https://docs.drone.io/runner/kubernetes/configuration/resources/
- Drone Kubernetes step syntax (`privileged`): https://docs.drone.io/pipeline/kubernetes/syntax/steps/
- Drone pipeline conditions docs: https://docs.drone.io/pipeline/conditions/
- Drone promotions docs: https://docs.drone.io/promote/
- Drone environment variable reference: https://docs.drone.io/pipeline/environment/reference/
- Drone variable substitution docs: https://docs.drone.io/pipeline/environment/substitution/
- Drone CLI secret add docs: https://docs.drone.io/cli/secret/drone-secret-add/
- Drone CLI repo update docs: https://docs.drone.io/cli/repo/drone-repo-update/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes `kubectl set image` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Deployment docs (`kubectl rollout status` examples): https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Drone server Helm values used `envFrom` and `persistence`, but the current official chart expects `extraSecretNamesForEnvFrom` and `persistentVolume`. I updated the values block to match the chart so the example aligns with the current official Helm templates.
- The post installed `drone/drone-runner-kube` with Helm, but the official `drone-runner-kube` chart has been deprecated. I replaced that section with the current documented installation approach: a Kubernetes manifest containing the runner `Deployment`, `ServiceAccount`, and required `Role` and `RoleBinding`.
- The Kubernetes runner resource examples used CPU values like `100m` and `1`, but the official runner docs specify integer millicore values for `DRONE_RESOURCE_REQUEST_CPU` and `DRONE_RESOURCE_LIMIT_CPU`. I corrected those values to `100` and `1000`.
- The example used the Docker plugin in a Kubernetes pipeline without accounting for the privileged requirement. I added the `privileged: true` setting and a note that the repository must be marked trusted in Drone, matching the official Kubernetes pipeline syntax and repository trust model.
- The build-and-deploy step conditions only matched `branch: main`. Drone evaluates the target branch for pull requests, so these steps could run for pull requests targeting `main` where secrets are not exposed by default. I added `event: push` to restrict secret-dependent steps to push builds.
- The Rancher kubeconfig encoding command used GNU `base64 -w 0`, which is not portable across common shells and OSes. I replaced it with `base64 < file | tr -d '\n'` so the command works more reliably.
- The promotion example used `DRONE_BUILD_PARENT_SHA`, which is not a documented Drone environment variable. I replaced it with `DRONE_COMMIT_SHA`, which remains available in promoted builds, and added a trigger to the staging pipeline so it only runs on pushes to `main` instead of also running during promotion events.

## Review Notes
- The post is now technically consistent with the current official docs, but the Drone Kubernetes runner is still documented upstream as Beta and community-supported rather than production-grade.
- The Kubernetes runner Helm chart is deprecated upstream even though the runner itself is still documented; manifest-based installation is the current official path.
