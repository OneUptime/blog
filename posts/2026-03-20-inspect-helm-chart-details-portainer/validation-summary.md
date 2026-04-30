# Validation Summary: How to Inspect Helm Chart Details in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Helm
- Kubernetes
- YAML

## Sources Consulted
- Portainer Documentation: Inspect a Helm application - https://docs.portainer.io/user/kubernetes/applications/inspect-helm
- Helm Documentation: `helm get values` - https://helm.sh/docs/helm/helm_get_values/
- Helm Documentation: `helm history` - https://helm.sh/docs/helm/helm_history/
- Helm Documentation: `helm get manifest` - https://helm.sh/docs/helm/helm_get_manifest/
- Helm Documentation: `helm get all` - https://helm.sh/docs/helm/helm_get_all/
- Helm Documentation: `helm get notes` - https://helm.sh/docs/helm/helm_get_notes/
- Helm Documentation: `helm rollback` - https://helm.sh/docs/helm/helm_rollback/

## Issues Found
- The navigation path was outdated. The post said to open `Applications > Helm charts`, but current Portainer documentation says to open `Applications` and then select the Helm application. I updated the access steps to match the current UI.
- The release overview fields were not aligned with current Portainer documentation. The post listed a generic status field, while the official docs explicitly document chart source and revision in the details view. I replaced the inaccurate field with documented release metadata.
- The Values section incorrectly described the displayed data as the combination of chart defaults and overrides. Portainer documents the Values tab as showing deployed values with a `User defined only` toggle, and Helm documents `helm get values` as returning user-supplied values unless `--all` is used. I corrected the explanation and updated the CLI examples to distinguish user-supplied values from computed values.
- The rollback UI description was inaccurate. The post described a history table with a rollback button for each revision, while Portainer documents a revisions list where you select a revision and then click `Rollback`. I updated that description.

## Review Notes
- Reviewed against Portainer 2.39 LTS documentation as available on 2026-04-30.
- Reviewed Helm command syntax against the current official Helm CLI documentation available on 2026-04-30.
