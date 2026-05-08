# Validation Summary: Safely Updating the Calico BGPConfiguration Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico BGPConfiguration resources
- calicoctl
- Kubernetes
- kubectl
- Kubernetes RBAC
- BGP

## Sources Consulted
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico resource definitions reference: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico calicoctl overview and low-level configuration update workflow: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl configuration guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes API concepts and field validation behavior: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The export and diff commands fetched all BGPConfiguration resources without naming the global `default` resource or using `--export`. Updated them to use `calicoctl get bgpconfiguration default -o yaml --export`, matching Calico's documented workflow for low-level BGP configuration updates.
- The update command used `calicoctl apply -f` and described it as validation. Updated the workflow to run `calicoctl validate -f` first and then `calicoctl replace -f`, because Calico documents `replace` as the standard update path for complete low-level Felix and BGP configuration specs.
- The rollback command used `calicoctl apply -f`. Updated it to `calicoctl replace -f` so rollback follows the same complete-spec update behavior.
- The log command selected pods by label without specifying the `calico-node` container. Updated it to include `-c calico-node`, matching the later Felix log command and avoiding ambiguity in multi-container pods.
- The post assumed the `calico-system` namespace for every installation. Added a note that manifest-based installations commonly run `calico-node` in `kube-system`.
- The troubleshooting section said unknown fields are silently ignored by `kubectl`. Updated this because modern Kubernetes supports server-side field validation with warn or strict behavior, and Calico also provides `calicoctl validate`.
- The CRD version review command printed CRD names and creation timestamps, not served versions. Updated it to use `custom-columns` for `.spec.versions[*].name`.
- The RBAC example combined `kubectl auth can-i` action checking with `--list`, which are separate modes. Split it into a direct permission check and a separate allowed-actions listing.
- The events command was described as audit-log review. Updated the comment to describe it as reviewing recent Calico events, since Kubernetes events are not the Kubernetes audit log.

## Review Notes
The post is technically relevant and useful as a production change workflow. Future improvements could mention that newer Calico deployments with the Calico API server can manage Calico APIs through `kubectl`, while `calicoctl` remains required for some administrative commands such as `node`, `ipam`, `convert`, and `version`.
