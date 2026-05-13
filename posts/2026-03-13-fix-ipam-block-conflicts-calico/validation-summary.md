# Validation Summary: How to Fix IPAM Block Conflicts in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes
- kubectl

## Sources Consulted
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl ipam release - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl delete - https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico documentation: Decommission a node - https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Calico documentation: Block affinity resource - https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses

## Issues Found
- The original orphaned block affinity script used `calicoctl get blockaffinity -o jsonpath=...`, but the documented `calicoctl get` output formats are `yaml`, `json`, `ps`, `wide`, `custom-columns`, `go-template`, and `go-template-file`, not Kubernetes-style `jsonpath`. I changed the workflow to use `calicoctl get node -o go-template=...`.
- The original script deleted `blockaffinity` resources directly. The official Calico node decommissioning documentation says deleting a Calico `Node` resource removes associated workload endpoint, host endpoint, IP address resources, and related node configuration. I changed the stale-node cleanup to delete orphaned Calico node resources with `calicoctl delete node`.
- The original duplicate IP display used `grep "$IP"`, which can match partial addresses. I changed it to an `awk` equality check against the IP column.
- The original report-based IPAM release example did not generate a report or release from it. I changed it to the documented workflow: lock the datastore, run `calicoctl ipam check -o report.json`, release with `calicoctl ipam release --from-report=report.json`, and unlock the datastore.
- The original post described restarting `calico-kube-controllers` as forcing IPAM garbage collection. The official IPAM consistency workflow is `calicoctl ipam check` plus `calicoctl ipam release`, so I replaced that section with a verification step.

## Review Notes
The post is now technically accurate for current Calico Open Source documentation. The IPAM report workflow temporarily locks the datastore, which prevents new pod launches while locked; operators should run it during a maintenance window or keep the lock interval short.
