# Validation Summary: How to Inspect Helm Chart Details in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Helm
- kubectl
- ingress-nginx

## Sources Consulted
- Portainer: Inspect a Helm application: https://docs.portainer.io/sts/user/kubernetes/applications/inspect-helm
- Portainer: Edit a Helm application: https://docs.portainer.io/sts/user/kubernetes/applications/edit-helm
- Portainer: Create an application from a Helm chart: https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Helm: `helm get values`: https://helm.sh/el/docs/helm/helm_get_values/
- Helm: `helm get notes`: https://helm.sh/docs/helm/helm_get_notes/
- Helm: `helm get manifest`: https://helm.sh/el/docs/helm/helm_get_manifest/
- Helm: `helm show values`: https://helm.sh/ja/docs/v3/helm/helm_show_values/
- Helm: `helm show chart`: https://helm.sh/docs/helm/helm_show_chart/
- Helm: `helm search repo`: https://helm.sh/ja/docs/helm/helm_search_repo
- Helm: plugin guide: https://helm.sh/docs/plugins/
- Helm: chart file structure (`values.schema.json`): https://docs.helm.sh/docs/topics/charts/
- Kubernetes: recommended application labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- ingress-nginx chart README: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/README.md

## Issues Found
- The Portainer navigation path was slightly inaccurate. The post said `Applications → Helm`, but current Portainer docs describe selecting `Applications` and then the Helm application. I corrected the navigation text.
- The Portainer values/manifests UI labels were off. I changed the post from a `User supplied values` tab reference to the documented `Values` tab with the `User defined only` option, and clarified that the rendered YAML is shown in the `Manifest` tab while the `Resources` tab is for browsing deployed objects.
- The sample chart naming was inconsistent. The article mixed `nginx-ingress-controller` with `ingress-nginx` examples even though the sample version/app-version pairing matched the `ingress-nginx` chart. I normalized those examples so the chart names are internally consistent.
- The release notes section used a chart-specific notes snippet with mismatched naming. I replaced it with the accurate Helm CLI equivalent, `helm get notes`, which is the documented way to retrieve release notes.
- The revision comparison example omitted that `helm diff revision` is not part of core Helm. I added a note that it requires the separately installed `helm-diff` plugin.
- The resource inspection section overstated what the commands returned. `helm get manifest | grep "^kind:"` only lists kinds, not the actual rendered resources, and `kubectl get all -l ...` is not comprehensive and depends on chart-applied labels. I replaced this with an accurate manifest inspection command and a narrower labeled-object query.
- The schema section used the wrong Helm command. `helm show chart` shows `Chart.yaml` metadata, not `values.schema.json`, and `helm inspect chart` has been renamed to `helm show`. I corrected the section to use `helm show chart` for metadata and `helm pull` plus direct file inspection for `values.schema.json` when present.
- The chart-repository examples were switched to the official `ingress-nginx` Helm repository and now include the missing `helm repo add` step so the `helm show`, `helm pull`, and `helm search repo` commands work as written.

## Review Notes
- The sample release/version values such as `ingress-nginx-4.8.0` and app version `1.9.4` are illustrative historical examples, not current latest-version claims.
- Portainer’s revision and diff features are version-dependent UI behavior; the corrected wording matches current Portainer STS documentation as of April 24, 2026.
- `app.kubernetes.io/instance` is a recommended Kubernetes label, not a guarantee from Kubernetes itself, so label-based `kubectl` filtering remains chart-dependent.
