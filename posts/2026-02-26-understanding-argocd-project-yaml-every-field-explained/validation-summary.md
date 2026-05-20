# Validation Summary: Understanding ArgoCD project.yaml: Every Field Explained

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Argo CD AppProject
- Argo CD RBAC
- Argo CD sync windows
- Argo CD GnuPG signature verification
- Kubernetes resource scoping
- Helm and OCI repositories
- YAML

## Sources Consulted
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Projects user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Applications in any namespace: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Argo CD GnuPG verification: https://argo-cd.readthedocs.io/en/stable/user-guide/gpg-verification/
- Argo CD Helm guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/

## Issues Found
- The complete AppProject example omitted current AppProject fields that the post later discussed, plus `permitOnlyProjectScopedClusters`. I added the missing fields to the top-level example and added a short section for `spec.permitOnlyProjectScopedClusters`.
- The Helm OCI repository example used an `oci://` prefix. Argo CD's Helm documentation says OCI Helm `repoURL` values omit that prefix, so I changed the example to `registry.example.com/charts`.
- The namespace resource blacklist example included `PersistentVolume`, which is cluster-scoped, not namespace-scoped. I replaced it with `NetworkPolicy`, matching the official AppProject examples.
- The RBAC resource and action lists were incomplete for current Argo CD. I expanded the resource list to include `applicationsets`, `certificates`, `accounts`, `gpgkeys`, and `extensions`, and clarified the `action/<group>/<kind>/<action-name>` and `invoke` action forms.
- The signature verification explanation only mentioned commits. Argo CD also verifies signed annotated tags when the target revision resolves to a tag, so I updated the wording to cover Git revisions.
- The project resource filter examples did not mention the optional `name` field. I added examples and a note for name-based resource matching.

## Review Notes
The post is technically relevant and the corrected examples align with current Argo CD stable documentation. Some illustrative YAML snippets intentionally show alternative configurations under the same field name; future edits could split those alternatives into separate snippets for easier copy-paste use.
