# Validation Summary: How to Deploy Applications with Fleet

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- Kustomize
- `kubectl`

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet GitRepo resource reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet deployment tutorial: https://fleet.rancher.io/tutorials/tut-deployment
- Rancher Fleet examples repository: https://github.com/rancher/fleet-examples
- Kubernetes `kubectl` quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The original `fleet.yaml` example used `targets:` for bundle customization. Current Fleet documentation uses `targetCustomizations:` inside `fleet.yaml`, while `targets:` belongs on the `GitRepo` resource. I removed the invalid customization block from the simple manifest example.
- The original `fleet.yaml` used `namespace: my-app` while the example repository also contained a cluster-scoped `Namespace` resource. Fleet documents that `namespace` forces all resources into that namespace and fails if cluster-scoped resources exist. I changed this to `defaultNamespace: my-app`.
- The original simple manifest example attempted per-cluster replica changes through `helm.values`, but the rendered manifests shown in the post are plain static YAML and do not consume Helm values as written. I simplified the base example to a valid manifest-style bundle configuration.
- The original root `GitRepo` example used `paths: - /`. Fleet documentation describes either explicit relative bundle paths or repository scanning when `fleet.yaml` files are discovered. I removed the undocumented root-path example and relied on repository scanning for the simple layout shown.
- The multi-environment `GitRepo` example deployed both `overlays/staging` and `overlays/production` to the same `all-clusters` target, which would push both overlays to every selected cluster. I corrected this by splitting the example into separate staging and production `GitRepo` resources with matching cluster selectors.
- The health-check example assumed a bundle name of `my-app`, but Fleet generates bundle names from the `GitRepo` name and path unless explicitly overridden. I changed the command to use a literal placeholder bundle name.
- The events command sorted by `.lastTimestamp`. Current Kubernetes `kubectl` guidance uses `.metadata.creationTimestamp` for event sorting. I updated the command accordingly.

## Review Notes
- The post is technically valid after the corrections above.
- The example keeps explicit `metadata.namespace` values in the manifests even though `defaultNamespace` is also set in `fleet.yaml`; this is valid, and the default only applies when a manifest omits its namespace.
- The update example uses `nginx:1.25` and `nginx:1.26` as illustrative tags. They are fine for demonstrating GitOps changes, but the post is not positioned as guidance on the latest NGINX release line.
