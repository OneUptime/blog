# Validation Summary: How to use Kustomize configMapGenerator for dynamic ConfigMap creation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kustomize
- ConfigMaps
- kubectl
- YAML

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes documentation: ConfigMaps, https://kubernetes.io/docs/concepts/configuration/configmap/
- Kustomize API source: ConfigMapArgs and GeneratorArgs, https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/configmapargs.go and https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/generatorargs.go
- Kustomize API source: GeneratorOptions, https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/generatoroptions.go
- Kustomize API source: KvPairSources, https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/kvpairsources.go
- Kustomize generator package documentation, https://pkg.go.dev/sigs.k8s.io/kustomize/api/internal/generators

## Issues Found
- The post stated that ConfigMap hash suffixes directly cause Kubernetes to recognize configuration updates and restart all affected pods. I changed this to explain that Kustomize updates recognized references, which changes pod templates in controllers such as Deployments and causes a rollout when the rebuilt manifests are applied.
- The post described ConfigMaps as immutable from a pod's perspective. I corrected this distinction: environment variables from ConfigMaps require a pod restart, while ConfigMaps mounted as volumes are eventually updated by the kubelet.
- The binary data section claimed binary files are base64 encoded automatically. I corrected it to state that configMapGenerator writes file contents to the ConfigMap `data` field, which is for UTF-8 strings, and that non-UTF-8 content should use manually defined `binaryData` or a Secret when sensitive.
- The multi-file section showed a glob pattern (`configs/*.conf`). Kustomize's documented file source formats are file paths, custom `key=path` entries, or directories. I replaced the glob example with a directory example and explicit file list.
- The rolling restart example said all pods using the ConfigMap will restart. I changed it to describe Deployment rollout behavior after applying rebuilt manifests.
- The validation command `kubectl get -f - configmap -o yaml` mixed file input and a resource type. I changed it to `kubectl get -f - -o yaml`.
- The `yq` validation example read `.data` from the whole stream. I changed it to select ConfigMap documents first.

## Review Notes
The remaining examples use current Kustomize fields (`literals`, `files`, `envs`, `behavior`, and per-generator `options`) and match the current Kubernetes documentation. The standalone `kustomize` and embedded `kubectl kustomize` versions can differ, so users should check their local tool version when relying on newer Kustomize behavior.
