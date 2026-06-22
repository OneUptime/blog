# Validation Summary: How to Uninstall Helm Releases and Clean Up Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm
- Kubernetes
- kubectl
- Custom Resource Definitions
- PersistentVolumes and PersistentVolumeClaims
- StatefulSets
- CI/CD cleanup scripting

## Sources Consulted
- Helm uninstall command reference: https://helm.sh/docs/helm/helm_uninstall/
- Helm "Using Helm" uninstall behavior: https://helm.sh/docs/intro/using_helm/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Helm resource policy guidance: https://helm.sh/docs/howto/charts_tips_and_tricks/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes CRD documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post stated broadly that Helm does not remove PVCs. Updated this to distinguish normal templated PVCs, which Helm can delete, from retained PVCs created by StatefulSet `volumeClaimTemplates` or protected by `helm.sh/resource-policy: keep`.
- The post stated broadly that CRDs persist after uninstallation. Clarified that this applies to CRDs installed from a chart's `crds/` directory, which Helm does not upgrade or delete.
- The "What Helm Deletes" section omitted hook resources and over-focused on Jobs with `resource-policy: keep`. Updated it to explain that hook-created resources are not managed as part of the release unless hook delete policies clean them up.
- The history cleanup example repeated `helm uninstall --keep-history` after the release had already been uninstalled. Replaced that with a manual check for retained release secrets before deleting the relevant Helm release secret.
- The CRD finalizer removal example presented force removal too casually. Added a safety warning consistent with Kubernetes finalizer guidance.

## Review Notes
The command examples and Helm flags are current in the official Helm command reference. Local `helm` and `kubectl` binaries were not installed in the workspace, so CLI behavior was validated against official documentation rather than local `--help` output.
