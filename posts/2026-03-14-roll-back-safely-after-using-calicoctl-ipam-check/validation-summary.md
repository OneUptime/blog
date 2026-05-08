# Validation Summary: Rolling Back Safely After Using calicoctl ipam check

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- kubectl

## Sources Consulted
- Calico documentation: `calicoctl ipam check` - https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico documentation: `calicoctl ipam release` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico documentation: BlockAffinity resource - https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico documentation: Configure calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Kubernetes documentation: `kubectl delete` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes documentation: Field selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: `kubectl get` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- Clarified the rollback guidance for released IPs. The original text implied the pod would lose its IP and simply get a new one; Calico documents that `calicoctl ipam release` does not remove the address from existing endpoints, but makes it available for assignment again. The post now says to restart the affected pod so the recreated instance receives an IP allocated in Calico IPAM.
- Updated the block affinity wording from the Calico node process automatically re-claiming blocks to Calico IPAM being able to claim new blocks when pods are scheduled. This better matches Calico's IPAM-managed BlockAffinity model.
- Fixed the dry-run script. The original script told readers to rerun it with an `--execute` flag, but the script did not implement that flag. The script now generates `report.json`, locks the datastore while generating and reviewing the report, and points to the documented `calicoctl ipam release --from-report report.json` remediation command.

## Review Notes
The `calico-node` namespace can be `calico-system` or `kube-system` depending on the Calico installation method. The command shown is plausible for operator-based installs, but future revisions could mention checking the actual DaemonSet namespace before deleting the pod.
