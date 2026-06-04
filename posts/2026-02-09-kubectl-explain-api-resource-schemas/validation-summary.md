# Validation Summary: How to Use kubectl explain to Explore API Resource Schemas from the Command Line

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes API resources and OpenAPI schemas
- CustomResourceDefinitions
- Bash scripting

## Sources Consulted
- Kubernetes kubectl explain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Services networking concepts: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post said required fields are marked in the description. In kubectl explain plaintext output, required fields are indicated on the FIELD line with `-required-`, so the wording was corrected.
- The post said `pods.spec.containers` shows both `name` and `image` as required. The Kubernetes Pod API reference marks container `name` as required, while `image` is optional to allow higher-level workload controllers to default or override images. The example was corrected.
- The post described recursive output as the complete field hierarchy. The official kubectl explain reference documents `--recursive` as printing fields of fields and currently only one level deep. The wording was corrected.
- The resource requirement examples tried to explain `requests.cpu`, `requests.memory`, `limits.cpu`, and `limits.memory` as schema child fields. Kubernetes models requests and limits as resource maps, so those common resource names are map keys rather than fixed explainable child fields. The examples now stop at `requests` and `limits`.
- The Service examples used `services.spec.loadBalancerIP`, which is deprecated in Kubernetes v1.24 and later. It was replaced with `services.spec.loadBalancerClass`.
- The YAML template script comment said it was getting required fields, but the pipeline lists field hints from recursive explain output. The comment was corrected.

## Review Notes
`kubectl` was not installed in the local workspace, so command behavior was reviewed against official Kubernetes documentation rather than local `kubectl --help` output. CRD examples depend on the referenced CRD being installed in the target cluster.
