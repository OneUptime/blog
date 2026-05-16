# Validation Summary: How to Use Immutable ConfigMaps on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes ConfigMaps
- Kubernetes kubelet ConfigMap change detection
- kubectl
- Kustomize
- Helm

## Sources Consulted
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes tutorial on updating configuration via immutable ConfigMaps: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes kubectl generated reference for `kubectl create configmap`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kustomize API types documentation for generator options: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Helm chart template documentation: https://helm.sh/docs/topics/charts
- Helm template function documentation: https://helm.sh/docs/v3/chart_template_guide/function_list
- Talos Linux introduction: https://www.talos.dev/docs/latest/introduction/what-is-talos/

## Issues Found
- The post said kubelet watches all ConfigMaps in large clusters. Kubernetes documentation frames the performance benefit around ConfigMaps mounted or consumed by Pods, so the wording was changed to "many ConfigMaps mounted by Pods."
- The post said mutable ConfigMaps are watched while also "polling for updates every sync cycle." Kubernetes documents watch, TTL cache, and direct-fetch change detection strategies, with the default being watch-based and projected volume updates delayed by sync period plus cache propagation. The performance explanation was corrected.
- The post said Kustomize and Helm both use content hashes as the version identifier. Kustomize automatically appends a content hash to generated ConfigMaps; Helm only does this when a chart explicitly templates such a pattern. The wording was corrected.
- The post said Kustomize updates all references. Kustomize updates supported name references, so the wording was narrowed to "supported references."

## Review Notes
- `kubectl`, `kustomize`, and `helm` were not installed in the local environment, so CLI behavior and template syntax were checked against official documentation instead of local `--help` output.
- The cleanup example that searches Pod JSON with `grep` is a rough heuristic. It is usable as a simple example, but a production cleanup tool should parse Kubernetes objects structurally and account for references in Deployments, ReplicaSets, StatefulSets, DaemonSets, CronJobs, and Jobs, not only currently running Pods.
