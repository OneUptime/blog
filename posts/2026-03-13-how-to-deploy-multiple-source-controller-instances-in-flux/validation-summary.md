# Validation Summary: How to Deploy Multiple Source Controller Instances in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux source-controller
- Kubernetes Deployments and Services
- Kubernetes NetworkPolicy
- GitRepository and HelmRepository custom resources
- kubectl

## Sources Consulted
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux source-controller options documentation: https://fluxcd.io/flux/components/source/options/
- Flux source-controller overview documentation: https://fluxcd.io/flux/components/source/
- Flux v2.8 release notes and component versions: https://github.com/fluxcd/flux2/releases
- Kubernetes NetworkPolicy concepts: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The prerequisites listed Kubernetes v1.25+ and Flux CLI v2.0+, but the current Flux v2.8 release line supports Kubernetes v1.33 to v1.35 and the example now uses a v2.8-era source-controller image. Updated the prerequisites to align with the shown controller image.
- The source-controller image tag was outdated at `ghcr.io/fluxcd/source-controller:v1.4.1`. Updated it to `ghcr.io/fluxcd/source-controller:v1.8.3`, the source-controller version listed for the current Flux v2.8 release line.
- The downstream controller section did not mention Flux's requirement to keep labels consistent across related Flux resources when kustomize-controller and helm-controller are also sharded. Added a short clarification for Kustomization, HelmRelease, and generated HelmChart resources.
- The artifact availability check used `curl` against a cluster DNS name from the local shell. Cluster service DNS names are normally resolvable only inside the cluster, so the command was changed to run a temporary curl pod in the `flux-system` namespace.

## Review Notes
The Deployment, Service, GitRepository, HelmRepository, NetworkPolicy, and kubectl examples are syntactically valid after the corrections. The official Flux sharding guide recommends generating sharded controller manifests with Kustomize patches so future Flux upgrades update main and sharded controllers together; the post's manually written manifests are still technically valid but require the operator to keep image tags and controller args aligned with the installed Flux release.
