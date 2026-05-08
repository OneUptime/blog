# Validation Summary: Building a Runbook for Data Store Initialization Errors in Calico

## Status
validated

## Post Type
Runbook / Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- kubectl
- calicoctl
- Kubernetes RBAC
- Kubernetes CustomResourceDefinitions

## Sources Consulted
- Calico datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico Kubernetes controllers configuration reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico calicoctl Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The introduction claimed datastore initialization errors block all pod networking. Calico documentation states that if the datastore is unavailable, the existing Calico network can continue operating but cannot be updated and new pods cannot be networked. Updated the wording to avoid the overly broad claim.
- Several `kubectl get pods` pipelines filtered table output without `--no-headers`, which could count or display the header as a non-running pod. Added `--no-headers` to the affected commands.
- The `calicoctl node status` diagnostic was presented like a cluster-wide query. The official reference describes it as checking the local Calico node instance, so the heading now notes that it should be run on an affected node.
- The CRD version command used `kubectl get crds | awk '{print $1, $2}'`, but the default CRD table does not report installed served/storage versions in the second column. Replaced it with a `custom-columns` query against `.spec.versions[*].name`.
- The RBAC example combined `kubectl auth can-i create <resource>` with `--list`, which are different `can-i` modes, and described the command as checking who has permissions. Updated it to check whether the current user can create Calico GlobalNetworkPolicy resources.
- The security-hardening command described Kubernetes events as audit-log-backed resource changes. Updated the comment to accurately describe it as reviewing recent `calico-system` events.

## Review Notes
- `kubectl` and `calicoctl` were not installed in the local workspace, so command validation was performed against official Kubernetes and Calico documentation rather than local CLI help.
- The Calico system namespace and labels can differ by installation method and version; `calico-system` and `k8s-app=calico-node` are plausible for operator-managed installations, but some clusters still use `kube-system`.
