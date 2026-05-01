# Validation Summary: How to Configure Drone CI with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Drone CI / Drone server
- Drone Kubernetes runner (`drone-runner-kube`)
- Drone CLI and API
- Helm
- Kubernetes
- Rancher
- GitHub OAuth
- GitHub Container Registry (GHCR)

## Sources Consulted
- Drone GitHub provider docs: https://docs.drone.io/server/provider/github/
- Drone Kubernetes runner installation: https://docs.drone.io/runner/kubernetes/installation/
- Drone Kubernetes runner configuration reference: https://docs.drone.io/runner/kubernetes/configuration/reference/
- Drone Kubernetes pipeline overview: https://docs.drone.io/pipeline/kubernetes/overview/
- Drone substitution reference: https://docs.drone.io/pipeline/environment/substitution/
- Drone CLI installation: https://docs.drone.io/cli/install/
- Drone CLI configuration: https://docs.drone.io/cli/configure/
- Drone CLI `secret add`: https://docs.drone.io/cli/secret/drone-secret-add/
- Drone CLI `repo enable`: https://docs.drone.io/cli/repo/drone-repo-enable/
- Drone API overview: https://docs.drone.io/api/overview
- Drone API build creation: https://docs.drone.io/api/builds/build_create/
- Official Drone Helm charts repo: https://github.com/drone/charts
- Drone charts index: https://charts.drone.io/index.yaml
- Deprecated `drone-runner-kube` chart README: https://raw.githubusercontent.com/drone/charts/master/charts/drone-runner-kube/README.md
- Drone Kaniko plugin registry entry: https://plugins.drone.io/plugins/kaniko
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The introduction said the Kubernetes runner executes pipelines as Kubernetes Jobs. Drone’s Kubernetes pipeline and runner docs describe steps as containers inside Kubernetes Pods, and the runner implementation interacts with Pods. I corrected the explanation to use Pods.
- The server Helm values used the legacy `kubernetes.io/ingress.class` annotation. Kubernetes documents `ingressClassName` as the replacement, so I updated the example to use `ingress.className`.
- The published `drone` chart metadata advertises app version `2.20.0`, but its packaged default `values.yaml` still pins `drone/drone:2.12.1`. I added `image.tag: "2.20.0"` so the example does not deploy an older server image by default.
- The runner example pointed `DRONE_RPC_HOST` at the server service without the service port. The official `drone` chart exposes the service on port `8080`, so I changed the host to `drone.drone.svc.cluster.local:8080`.
- The official `drone-runner-kube` Helm chart source README marks the chart deprecated, and the packaged chart defaults still pin an older runner image (`1.0.0-rc.3`). I added a deprecation note, pinned the chart to `0.1.10`, and overrode the runner image tag to `1.0.0-rc.5`.
- The pipeline example used `plugins/docker` on a Kubernetes runner without any explanation of privileged execution requirements. I replaced it with the official `plugins/kaniko` plugin, which the Drone plugin registry documents as not requiring privileged mode.
- The deploy step assumed Kubernetes RBAC that the post never mentioned. I added `service_account_name: drone-deployer` and clarified that the deploy step requires a service account with permission to update the target Deployment.
- The CLI setup used the placeholder name “personal access token” for `DRONE_TOKEN`, but Drone’s CLI docs describe this as a Drone user authorization token from the Drone UI. I corrected the wording.
- The manual trigger command used `drone build create`, which is not present in the current Drone CLI reference. I replaced it with the documented REST API call using `Authorization: Bearer ${DRONE_TOKEN}`.
- The first best-practices bullet overstated the recommendation to prefer `drone-runner-kube`. I updated it to reflect the current official state: the runner is still beta and the published Helm chart is deprecated.

## Review Notes
- Manual builds created through the Drone API use event type `custom`. If the pipeline later adds `when.event` filters, `custom` must be included for manual triggers to run.
- The post is now technically accurate, but the Rancher-specific content remains light; most steps apply to any Kubernetes cluster managed by Rancher.
