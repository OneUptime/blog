# Validation Summary: Fix Missing ServiceMonitor CRDs in Helm or Argo CD

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kubernetes API discovery and CustomResourceDefinitions
- `kubectl`
- Prometheus Operator
- ServiceMonitor, Probe, and ScrapeConfig custom resources
- Helm
- Argo CD
- Server-Side Apply and server-side dry run

## Sources Consulted

- [Prometheus Operator installation guide](https://prometheus-operator.dev/docs/getting-started/installation/)
- [Prometheus Operator compatibility](https://prometheus-operator.dev/docs/getting-started/compatibility/)
- [Prometheus Operator design and resource selectors](https://prometheus-operator.dev/docs/getting-started/design/)
- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/)
- [Prometheus Operator CRD update troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#customresourcedefinition--is-invalid-metadataannotations-too-long-issue)
- [Prometheus Operator ServiceMonitor v1 types](https://github.com/prometheus-operator/prometheus-operator/blob/main/pkg/apis/monitoring/v1/types.go)
- [Kubernetes CustomResourceDefinition task guide](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
- [Kubernetes CRD versioning guide](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/)
- [Kubernetes removed feature-gate reference](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/)
- [`kubectl api-resources` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/)
- [`kubectl apply` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [`kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [`kubectl explain` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/)
- [Kubernetes Server-Side Apply reference](https://kubernetes.io/docs/reference/using-api/server-side-apply/)
- [Helm CRD best practices](https://helm.sh/docs/chart_best_practices/custom_resource_definitions/)
- [Helm chart hook and installation lifecycle](https://helm.sh/docs/topics/charts_hooks/)
- [Argo CD sync options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [Argo CD sync phases and waves](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)
- [Argo CD Application specification](https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/)

## Issues Found

- The context guidance incorrectly implied that Argo CD uses the operator's local kubeconfig context. It now distinguishes Helm's kubeconfig/context from Argo CD's configured Application destination and cluster credentials.
- The Prometheus Operator CEL compatibility statement omitted Kubernetes 1.24. It now states that Operator v0.84.0 and later requires Kubernetes 1.25 or newer, while Kubernetes 1.23–1.24 requires the `CustomResourceValidationExpressions` feature gate.
- The `kubectl apply` example used `<pinned-crd-manifests>`, which is parsed by a shell as redirection and is not valid placeholder syntax in an executable command. It now uses a documented illustrative local directory.
- The Helm guidance implied that upgrading a chart release upgrades its CRDs. Helm installs CRDs from `crds/` before templates on initial installation, skips existing CRDs, and does not upgrade or delete them. The post now directs readers to the chart's documented CRD lifecycle or a separate pinned CRD update.
- The Argo CD guidance implied that CRDs and their instances must be split into separate phases or Applications. Argo CD supports them in the same sync and automatically skips the missing-type dry run when the CRD is included. The post now reserves explicit gating for CRDs managed elsewhere and does not treat the sync-wave delay as proof of API discovery.
- The deployment-client paragraph was too broad for Helm and Argo CD, both of which have CRD-aware sequencing in their supported layouts. It now limits the race warning to clients or arrangements without that sequencing.
- The ServiceMonitor selection statement incorrectly required explicit object/namespace labels and a named Service port in every case. It now describes the selector fields and the current v1 endpoint choices: `port` for a named Service port or `targetPort` for a selected Pod container port. The `kubectl explain` command was also pinned to `monitoring.coreos.com/v1` so it inspects the same schema as the manifest.

## Review Notes

The remaining commands and explanations were verified as correct, including CRD `served` and `Established` semantics, the ServiceMonitor group/version/kind, Server-Side Apply conflict behavior, server-side dry run, and the distinct Probe and ScrapeConfig selectors. Command syntax was checked against the current official `kubectl` references and local `kubectl` v1.34.1. All external links already present in the post resolved successfully during review.
