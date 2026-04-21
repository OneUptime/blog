# Validation Summary: How to Troubleshoot ImagePullBackOff Errors in Portainer - Troubleshoot

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- Docker CLI
- Docker Registry HTTP API V2
- Container image pull secrets

## Sources Consulted
- Kubernetes documentation: Images and ImagePullBackOff behavior - https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes documentation: Pull an Image from a Private Registry - https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes kubectl reference: kubectl create secret docker-registry - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes kubectl reference: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Google Cloud GKE documentation: Troubleshoot image pulls and event examples - https://cloud.google.com/kubernetes-engine/docs/troubleshooting/image-pulls
- Docker documentation: docker image pull - https://docs.docker.com/reference/cli/docker/image/pull/
- CNCF Distribution documentation: HTTP API V2 tag listing - https://distribution.github.io/distribution/spec/api/
- Portainer documentation: Inspect an application - https://docs.portainer.io/user/kubernetes/applications/inspect
- Portainer documentation: Kubernetes cluster registries - https://docs.portainer.io/user/kubernetes/cluster/registries

## Issues Found
- The example Events output showed `BackOff pulling image` as a `Warning Failed` event. Kubernetes event output uses a separate `Normal BackOff` event for `Back-off pulling image`, while `Warning Failed` contains the pull failure and `ImagePullBackOff` messages. Updated the snippet to match documented event structure.
- The Portainer navigation said **Portainer > Registries**, which is imprecise for a Kubernetes environment. Updated it to **Cluster > Registries**, matching Portainer's Kubernetes registry access documentation.
- The `imagePullSecrets` YAML was introduced as a deployment example but used PodSpec-level fields directly under `spec`. Updated the snippet to place `imagePullSecrets` and `containers` under `spec.template.spec`, which is correct for workloads such as Deployments.
- The debug pod command passed `/bin/sh` as container arguments instead of overriding the container command. Added `--command -- /bin/sh` and `--restart=Never` so `kubectl run` starts an interactive one-off shell as intended.
- The summary claimed the Registries panel lets you update credentials without redeploying application stacks. Portainer documentation supports registry configuration and namespace access management, but not that exact redeployment behavior. Reworded the sentence to avoid the unsupported claim.

## Review Notes
The remaining examples are technically plausible for a Docker Registry API V2-compatible registry. Some hosted registries may require provider-specific authentication flows rather than simple Basic authentication with `curl -u`, but the example is valid for registries that support that mode.
