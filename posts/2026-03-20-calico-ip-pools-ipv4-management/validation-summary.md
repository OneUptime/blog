# Validation Summary: How to Configure Calico IP Pools for IPv4 Address Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- IPv4 networking
- Calico IPAM
- Calico `IPPool` resources
- `calicoctl`

## Sources Consulted
- Calico IP pool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Restrict a pod or namespace to a specific IP range: https://docs.tigera.io/calico/latest/networking/ipam/legacy-firewalls
- `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- `calicoctl patch` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Install `calicoctl`: https://docs.tigera.io/calico/latest/operations/calicoctl/install

## Issues Found
- The post used `apiVersion: crd.projectcalico.org/v1` in the `IPPool` manifests. I changed both manifests to `projectcalico.org/v3` because the current Calico resource reference documents `IPPool` with the v3 API, and the install documentation explicitly warns not to modify resources in the internal `crd.projectcalico.org` API group directly.
- The production pool example described `disabled: false` as if it disabled automatic assignment. I corrected that comment and added `assignmentMode: Automatic` so the example matches current `IPPool` semantics.
- The namespace-specific pool could have been used for general automatic workload allocation as written. I added `assignmentMode: Manual` so the pool is reserved for workloads that explicitly request it through the namespace annotation, which matches the section’s stated intent.
- The sample output shown for `calicoctl get ippool -o wide` did not match the wider column set documented for that command. I updated the example output to include the expected wide-format fields.
- `calicoctl get ipamblock` is not a valid `calicoctl get` resource, and `calicoctl ipam show --summary` is not a supported flag in the current CLI reference. I replaced those commands with `calicoctl ipam show --show-blocks` and `calicoctl ipam show`.
- The leak-cleanup example used `calicoctl ipam release --ip ...` as a generic troubleshooting step. I replaced it with the documented datastore lock, `calicoctl ipam check -o report.json`, `calicoctl ipam release --from-report=report.json`, and datastore unlock workflow, and I normalized the `--ip=` syntax to match the current CLI docs.

## Review Notes
- The `kubectl` examples assume the cluster exposes Calico APIs through `kubectl` (for example via the Calico API server or native `projectcalico.org/v3` CRDs). In environments without that capability, `calicoctl` remains the safer management interface for `IPPool` resources.
- The `blockSize` examples are valid, but `blockSize` can only be set when an IP pool is created.
