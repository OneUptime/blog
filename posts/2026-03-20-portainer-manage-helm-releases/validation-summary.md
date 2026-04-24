# Validation Summary: How to Manage Helm Releases in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- Helm
- Portainer API
- `kubectl`
- `curl`
- `jq`

## Sources Consulted
- Portainer Applications docs: https://docs.portainer.io/user/kubernetes/applications
- Portainer Inspect a Helm application docs: https://docs.portainer.io/sts/user/kubernetes/applications/inspect-helm
- Portainer Edit a Helm application docs: https://docs.portainer.io/sts/user/kubernetes/applications/edit-helm
- Portainer Remove an application docs: https://docs.portainer.io/user/kubernetes/applications/remove
- Portainer kubectl shell docs: https://docs.portainer.io/sts/user/kubernetes/kubectl
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Helm v3 `helm upgrade` docs: https://raw.githubusercontent.com/helm/helm-www/main/versioned_docs/version-3/helm/helm_upgrade.md
- Helm v3 `helm rollback` docs: https://raw.githubusercontent.com/helm/helm-www/main/versioned_docs/version-3/helm/helm_rollback.md
- Helm v3 `helm uninstall` docs: https://raw.githubusercontent.com/helm/helm-www/main/versioned_docs/version-3/helm/helm_uninstall.md
- Helm v3 `helm list` docs: https://raw.githubusercontent.com/helm/helm-www/main/versioned_docs/version-3/helm/helm_list.md
- Helm v3 usage guide: https://raw.githubusercontent.com/helm/helm-www/main/versioned_docs/version-3/intro/using_helm.md

## Issues Found
- The post said Portainer uses **Helm** → **Releases** in the sidebar. I changed this to **Applications**, which is the documented location for Helm-deployed applications in current Portainer docs.
- The inspection section claimed Portainer shows rendered values and hooks. I changed this to match the documented Helm application details and tabs: deployment details, raw values, resources, events, manifest, and notes.
- The API authentication example used lowercase JSON keys for `/api/auth`. I corrected them to `Username` and `Password` to match Portainer's OpenAPI schema.
- The release-details API example did not request resources even though the section discusses inspecting resources. I added `showResources=true`, which is the documented query parameter for that endpoint.
- The upgrade and rollback UI steps used labels that do not match current Portainer docs. I changed **Upgrade** to **Edit/Upgrade**, replaced the **History** section reference with the **Revisions** panel, and changed the rollback action to **Rollback**.
- The uninstall UI section included an unsupported **Delete PVCs** step. I removed it because the Portainer application-removal docs do not document a PVC deletion toggle for Helm app removal.
- The post referred to **KubeShell**. I changed this to Portainer's documented **kubectl shell** terminology.
- The post used a hardcoded chart version example and claimed `helm uninstall --keep-history` allows rollback later. I replaced the fixed chart version with a placeholder and removed the rollback-later claim because Helm's official docs only guarantee retained history.

## Review Notes
- Helm CLI examples were checked against Helm v3 documentation current on 2026-04-24 and are valid as written after the fixes above.
- The `bitnami/nginx` examples assume the chart reference is resolvable in the shell context, such as when the repository is already configured.
