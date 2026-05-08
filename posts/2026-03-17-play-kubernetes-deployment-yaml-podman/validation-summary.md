# Validation Summary: How to Play a Kubernetes Deployment YAML with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Kubernetes Deployment manifests
- Kubernetes YAML
- Podman named volumes
- Container restart behavior

## Sources Consulted
- Podman `podman kube play` documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Podman `podman kube down` documentation: https://docs.podman.io/en/stable/markdown/podman-kube-down.1.html
- Podman source for `playKubeDeployment` and `PlayKubeDown`: https://github.com/containers/podman/blob/main/pkg/domain/infra/abi/play.go
- Podman source for PVC volume handling: https://github.com/containers/podman/blob/main/pkg/specgen/generate/kube/volume.go
- Kubernetes Deployment API type definitions: https://github.com/kubernetes/api/blob/master/apps/v1/types.go

## Issues Found
- The original limitations section said crashed containers are not automatically restarted. Current Podman documentation says the default restart policy for containers created by `podman kube play` is `always`, so that statement was too broad. Changed it to state that Podman does not provide full Deployment controller reconciliation, such as creating replacement pods when pods are deleted or rescheduling them to another node.

## Review Notes
- `podman play kube` is still documented as an alias of `podman kube play`.
- Podman currently supports Deployment YAML and creates a pod named `<deployment-name>-pod`.
- Podman accepts `spec.replicas` for Deployments but limits the actual replica count to 1.
- `persistentVolumeClaim.claimName` maps to a Podman named volume. Volumes are not removed by `podman kube down` unless force removal is requested.
