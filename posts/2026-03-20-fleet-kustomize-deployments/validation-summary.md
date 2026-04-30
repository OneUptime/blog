# Validation Summary: How to Configure Fleet Kustomize Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher Fleet GitOps
- Kubernetes
- Kustomize
- JSON Patch (RFC 6902)

## Sources Consulted
- Fleet documentation, Git Repository Contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet documentation, `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Kubernetes documentation, Declarative Management of Kubernetes Objects Using Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- RFC 6902, JavaScript Object Notation (JSON) Patch: https://datatracker.ietf.org/doc/html/rfc6902

## Issues Found
- The `fleet.yaml` example used `targets`, which is not the correct bundle-level field for overriding GitRepo targeting. It was changed to `overrideTargets` to match the current Fleet reference.
- The Kustomize overlays used legacy `bases`, `patchesStrategicMerge`, and `patchesJson6902` examples. These were updated to the current `resources` and `patches` style shown in the Kubernetes Kustomize documentation.
- The JSON patch example attempted to append to `/spec/template/spec/containers/0/env/-` even though the base Deployment does not define an `env` array. It was corrected to add the `env` field itself, which is compatible with RFC 6902 semantics.
- The wording that Fleet “runs `kustomize build`” was narrowed to say Fleet renders the directory with Kustomize, which matches the official Fleet documentation without over-specifying the internal implementation.
- The prerequisite text was clarified from “kubectl access to Fleet manager” to “kubectl access to the Fleet manager cluster.”

## Review Notes
- The post is technically sound after the fixes above.
- Local CLI validation was not performed because `kustomize` and `kubectl` were not installed in this environment.
