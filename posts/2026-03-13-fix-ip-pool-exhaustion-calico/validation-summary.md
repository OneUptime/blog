# Validation Summary: How to Fix IP Pool Exhaustion in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- Calico IPPool resources
- calicoctl
- Kubernetes pods

## Sources Consulted
- Calico Open Source 3.32 documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source 3.32 documentation: calicoctl ipam release: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source 3.32 documentation: IPPool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Migrate from one IP pool to another: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico API package reference for IPPoolSpec validation: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3#IPPoolSpec

## Issues Found
- The post said an existing Calico IP pool could be expanded by patching `spec.cidr`. Current Calico API validation makes `spec.cidr` immutable and directs users to IP pool migration instead. I replaced the patch example with guidance to add a new non-overlapping pool.
- The report cleanup command used `ipam-report.json.json`. I corrected it to `ipam-report.json`.
- The automated cleanup example generated a report but did not run the documented `calicoctl ipam release --from-report` workflow. I updated the snippet to lock the datastore, generate the report, release leaked IPs from the reviewed report, and unlock the datastore.
- The post described `--from-report` as force IPAM block cleanup. The Calico command releases leaked addresses from an IPAM check report, so I corrected the heading and command comment.
- The added IPPool example only said the CIDR must be non-overlapping. Calico documentation also recommends IP pool CIDRs stay within the Kubernetes pod/cluster CIDR, so I added that caveat.

## Review Notes
The example IPPool uses `ipipMode: Always`, which is valid, but operators should match the encapsulation mode used by their cluster. The post does not target a specific Calico version; the review used current Calico 3.32 documentation and current Project Calico API validation.
