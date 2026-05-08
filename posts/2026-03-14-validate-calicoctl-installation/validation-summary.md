# Validation Summary: How to Validate Calicoctl Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico resource manifests
- Bash scripting

## Sources Consulted
- Calico calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico GlobalNetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The introduction said the guide validates binary integrity and command-line completion setup, but the examples only check binary presence, architecture, version output, and datastore operations. Updated the wording to describe what the post actually validates.
- The Binary Validation section said it verifies the binary is genuine, but the script does not perform checksum or signature verification. Updated the wording to say it verifies presence, executability, architecture, and version.
- The datastore script used `calicoctl get nodes -o name`, but official calicoctl output formats are `yaml`, `json`, `ps`, `wide`, `custom-columns=...`, `go-template=...`, and `go-template-file=...`; `name` is not a supported output format. Changed the command to `calicoctl get nodes`.
- The version compatibility script and troubleshooting text treated matching major.minor versions as sufficient. Official Calico documentation says the calicoctl version should match the Calico cluster version and mismatches can cause calls to fail unless `--allow-version-mismatch` is used. Updated the script to compare the full normalized version and corrected the troubleshooting note.

## Review Notes
- The `GlobalNetworkSet` validation resource uses the documentation-reserved CIDR `192.0.2.0/24`, which is appropriate for a non-routed test network set. It is still a real Calico resource, so operators should run the write checks only where creating and deleting a temporary global network set is acceptable.
