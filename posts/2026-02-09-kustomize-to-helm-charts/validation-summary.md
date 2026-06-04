# Validation Summary: How to Convert Kustomize Overlays to Helm Charts

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Kubernetes
- Kustomize
- Helm
- Helm chart templates
- kubectl
- yq
- Bash
- YAML

## Sources Consulted
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Helm helm create command reference: https://helm.sh/docs/helm/helm_create/
- Helm helm template command reference: https://helm.sh/docs/helm/helm_template/
- Helm helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/
- Helm named templates guide: https://helm.sh/docs/chart_template_guide/named_templates/
- Helm template function list: https://helm.sh/docs/chart_template_guide/function_list/
- Helm accessing files inside templates guide: https://helm.sh/docs/chart_template_guide/accessing_files/
- yq eval command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate

## Issues Found
- `kubectl kustomize` examples used unsupported `--dry-run=client` and `-o yaml` flags. Updated the commands to use `kubectl kustomize` directly, which emits rendered YAML by default.
- The base resource inventory command used `kubectl get -f -`, which queries live cluster objects rather than listing rendered Kustomize resources. Replaced it with `yq eval -N '.kind + "/" + .metadata.name' -` against the rendered manifest.
- The sample `apps/v1` Deployment lacked the required `spec.selector` and matching pod template labels. Added labels and selectors so the example is a valid Kubernetes Deployment.
- The Kustomize overlay example used `bases`, which is outdated in current Kustomize usage. Replaced it with `resources`.
- The environment values examples used YAML document separators between separate values files, which could be mistaken for a multi-document Helm values file. Split them into separate YAML code blocks.
- The Helm deployment patch example omitted the required Deployment selector and pod template labels. Added them to keep the example valid.
- The ConfigMap generator explanation implied full equivalence with Helm `.Files`. Added a caveat that Helm does not automatically add Kustomize's generated ConfigMap name hash suffix.
- The testing script counted yq document separators as potential resource kinds. Updated the yq commands to use `-N` and suppress document separators.
- The detailed diff command used `kubectl get --dry-run=client`, which is not the appropriate validation command. Replaced it with `kubectl apply --dry-run=client -f ... -o yaml`.

## Review Notes
The local workspace did not have `helm`, `kubectl`, or `yq` installed, so command validation was performed against official documentation rather than local CLI help output. The migration script remains intentionally simplified, as stated in the post; production conversion would still need review for complex images, multiple containers, generated names, and non-Deployment resources.
