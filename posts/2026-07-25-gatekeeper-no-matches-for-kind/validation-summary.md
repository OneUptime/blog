# Validation Summary: Debug “No Matches for Kind” After a Gatekeeper ConstraintTemplate

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OPA Gatekeeper
- Kubernetes
- ConstraintTemplate and Constraint custom resources
- CustomResourceDefinitions and Kubernetes API discovery
- Rego v0 and Rego v1
- kubectl
- Gator

## Sources Consulted
- [Gatekeeper debugging](https://open-policy-agent.github.io/gatekeeper/website/docs/debug/)
- [Gatekeeper ConstraintTemplates](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/)
- [Gatekeeper operations and required permissions](https://open-policy-agent.github.io/gatekeeper/website/docs/operations/)
- [Gatekeeper runtime flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper Gator CLI](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- [OPA Constraint Framework CRD generation source](https://github.com/open-policy-agent/frameworks/blob/master/constraint/pkg/client/crds/crds.go)
- [Kubernetes Discovery API](https://kubernetes.io/docs/concepts/overview/kubernetes-api/#discovery-api)
- [Kubernetes CustomResourceDefinition guide](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
- [Kubernetes kubectl JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes kubectl wait reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Kubernetes kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes kubectl auth can-i reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [OPA Rego v0 compatibility](https://www.openpolicyagent.org/docs/v0-compatibility)

## Issues Found
- The discovery-cache guidance implied that merely starting a new `kubectl` process refreshes discovery. It now explicitly uses `kubectl api-resources` to refresh discovery before retrying in a new process, matching the kubectl documentation.
- The ConstraintTemplate status JSONPath used `{"\\n"}`, which prints the two literal characters `\n` in a POSIX shell instead of a line break. Both literals were changed to `{"\n"}`.
- The structural-schema section attributed template rejection directly to the API server. Gatekeeper's validating webhook validates the embedded Constraint schema when a ConstraintTemplate is applied; the wording now distinguishes that rejection from controller-side ingestion and CRD-generation failures reported in status.
- The Rego v1 guidance did not state its Gatekeeper version boundary. It now specifies that the `code` entry with `engine: Rego` and `source.version: "v1"` is available in Gatekeeper 3.19 and later.
- The permissions section tied CRD creation only to the validating webhook operation. Current Gatekeeper supports a distinct `generate` operation in split deployments, so the text now refers to the process performing CRD generation and tells readers to inspect that Pod's ServiceAccount.
- The deployment sequence waited for the generated CRD's `Established` condition without first waiting for the asynchronously generated CRD to exist. A `kubectl wait --for=create` step was added before the condition wait to remove that race.
- The generated CRD name was incorrectly written as `k8sexamples.constraints.gatekeeper.sh`, and the text incorrectly described configurable Kubernetes pluralization. Gatekeeper lowercases the Constraint kind for both its singular and plural resource names without adding an `s`, so `K8sExample` generates `k8sexample.constraints.gatekeeper.sh`.
- The Kubernetes API discovery documentation link used an obsolete anchor on the API concepts page. It now points to the current Discovery API section of the Kubernetes API overview.

## Review Notes
The review used the current Gatekeeper v3.23.x documentation and current Kubernetes documentation as of 2026-07-25. The cluster-dependent commands were not run against a live Gatekeeper installation, but their syntax and described behavior were checked against official command references, the Gatekeeper and OPA Constraint Framework source, and local `kubectl` v1.34.1 client behavior. Installation layouts can differ, so the post correctly tells readers to inspect the actual Gatekeeper ServiceAccount and API versions in their cluster.
