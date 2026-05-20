# Validation Summary: How to Create ArgoCD Custom Resource Icons

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Custom Resource Definitions
- Argo CD UI resource icons
- Argo CD resource health customizations
- SVG assets

## Sources Consulted
- Argo CD official documentation: Custom resource icons - https://argo-cd.readthedocs.io/en/stable/developer-guide/custom-resource-icons/
- Argo CD official documentation: Resource Health - https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD official documentation: Resource Actions - https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/

## Issues Found
- The original post incorrectly stated that Argo CD resource icons can be configured through `argocd-cm` using `resource.customizations.icon.<group>_<Kind>` keys. Official Argo CD documentation does not define that ConfigMap key. I replaced the ConfigMap workflow with the supported source-level workflow: add `ui/src/assets/images/resources/<group>/icon.svg`, use color `#8fa4b1`, run `make resourceiconsgen`, and build or contribute the Argo CD change.
- The original post incorrectly claimed that Argo CD resource icons support Font Awesome icon names and inline SVG data URIs through `argocd-cm`. I removed those examples and clarified that Font Awesome icon classes apply to Argo CD resource action icons, not resource type icons.
- The original post said Argo CD picks up icon changes without component restarts after a ConfigMap update. I corrected this to explain that resource icons are bundled into the UI and require an Argo CD build/deployment containing the updated generated icon list and SVG assets.
- The original Kustomize example organized non-existent ConfigMap icon keys. I replaced it with source-tree organization guidance under `ui/src/assets/images/resources/`.
- The custom health check example used the correct `resource.customizations.health.<group>_<kind>` pattern, so I kept it and removed only the invalid adjacent icon ConfigMap entry.

## Review Notes
The post is now accurate for the Argo CD documented custom resource icon workflow. Future improvements could include linking to a real Argo CD pull request that adds an icon and adding version notes if Argo CD later introduces runtime-configurable resource icons.
