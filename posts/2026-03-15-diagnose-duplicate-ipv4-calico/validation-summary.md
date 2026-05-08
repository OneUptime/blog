# Validation Summary: How to Diagnose Duplicate IPv4 Address Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Calico IPAM
- calicoctl
- Kubernetes
- kubectl
- IPv4 pod networking

## Sources Consulted
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl ipam release, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Calico IPAM concepts, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: BlockAffinity resource, https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico documentation: WorkloadEndpoint resource, https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico documentation: datastore migrate lock and unlock, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock and https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Kubernetes documentation: kubectl get reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The pod duplicate-IP command parsed the seventh column from `kubectl get pods -A -o wide`, which can produce false positives from unassigned pod IPs such as pending pods. Changed it to use Kubernetes JSONPath and filter for assigned IPv4 addresses.
- The workload endpoint duplicate check parsed a fixed table column from `calicoctl get workloadEndpoint -o wide`. Calico documents YAML and template output for reliable structured fields, so the example now reads `ipNetworks` from YAML instead of assuming a wide-output column position.
- The post used `calicoctl get ipamBlock`, but `ipamBlock` is not listed as a `calicoctl get` resource in the current Calico reference. Replaced those examples with `kubectl get blockaffinities.crd.projectcalico.org` for node affinity inspection and kept `kubectl get ipamblocks.crd.projectcalico.org` for datastore-level IPAM block inspection.
- The block affinity custom-columns example used Calico field names without JSON paths. Replaced it with Kubernetes custom columns that reference `.metadata.name`, `.spec.cidr`, `.spec.node`, and `.spec.state`.
- The `calicoctl ipam show --show-blocks | grep leaked|orphan` example implied that leaked allocation checks come from `ipam show`. Calico documents `calicoctl ipam check` for IPAM consistency checks, so the command now uses `calicoctl ipam check --show-problem-ips`.
- The deleted-node cleanup example passed command output from `calicoctl ipam check | grep "$node"` directly into `--from-report`, but `--from-report` expects a report file. Updated the workflow to generate `report.json` with `calicoctl ipam check -o report.json` and release from that file.
- The IPAM report release workflow omitted the documented datastore lock and unlock steps. Added `calicoctl datastore migrate lock` and `calicoctl datastore migrate unlock` around report generation and release.
- The BIRD log note implied BIRD always runs in `calico-node`. Changed it to apply when using the Linux dataplane with BGP.

## Review Notes
The guide is technically relevant and salvageable. The remaining commands are diagnostic examples and still assume the common Calico Kubernetes API datastore and `calico-node` pods in the `calico-system` namespace; clusters installed with different namespaces, labels, or dataplanes may need minor selector adjustments.
