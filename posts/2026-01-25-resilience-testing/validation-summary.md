# Validation Summary: How to Configure Resilience Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Chaos Mesh
- Kubernetes
- Helm
- Chaos Mesh NetworkChaos, PodChaos, StressChaos, DNSChaos, and Schedule CRDs
- TypeScript
- Kubernetes JavaScript client (`@kubernetes/client-node`)
- Axios
- Prometheus recording and alerting rules
- GitHub Actions
- kubectl

## Sources Consulted
- Chaos Mesh Helm installation documentation: https://chaos-mesh.org/docs/production-installation-using-helm/
- Chaos Mesh NetworkChaos documentation: https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Chaos Mesh PodChaos documentation: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh StressChaos documentation: https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/
- Chaos Mesh DNSChaos documentation: https://chaos-mesh.org/docs/simulate-dns-chaos-on-kubernetes/
- Chaos Mesh Schedule documentation: https://chaos-mesh.org/docs/define-scheduling-rules/
- Kubernetes JavaScript client official repository: https://github.com/kubernetes-client/javascript
- Kubernetes JavaScript client 1.4.0 generated CustomObjectsApi declarations: https://unpkg.com/@kubernetes/client-node@1.4.0/dist/gen/types/ObjectParamAPI.d.ts
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- GitHub Actions variables documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables
- Azure setup-kubectl action README: https://github.com/Azure/setup-kubectl

## Issues Found
- The scheduled pod-kill example used an inline `scheduler` field inside a `PodChaos` resource. Current Chaos Mesh scheduling uses a separate `Schedule` resource with `spec.schedule`, `spec.type`, and a lower-camel experiment spec such as `podChaos`. Changed the example to `kind: Schedule` with `schedule: "@every 10m"` and nested `podChaos`.
- The TypeScript example used positional arguments for `createNamespacedCustomObject` and `deleteNamespacedCustomObject`. The current `@kubernetes/client-node` 1.4.0 exported `CustomObjectsApi` uses object-parameter request types. Updated both calls to pass request objects with `group`, `version`, `namespace`, `plural`, `body`, and `name` as appropriate.
- The GitHub Actions workflow wrote `export KUBECONFIG=kubeconfig` inside one `run` step, which would not persist to later steps. Updated it to append `KUBECONFIG=$PWD/kubeconfig` to `$GITHUB_ENV`, matching GitHub Actions' documented way to pass generated environment values to subsequent steps in the same job.
- The workflow used `azure/setup-kubectl@v3`; the current documented major version is `azure/setup-kubectl@v4`. Updated the action reference.

## Review Notes
- The Chaos Mesh YAML examples otherwise match the documented 2.8.3 CRD shapes for network delay, network partition, pod/container kill, stress, and DNS faults.
- The Prometheus rule syntax is valid, but real deployments should guard availability ratios against empty denominators if the service can have zero request traffic during the evaluation window.
