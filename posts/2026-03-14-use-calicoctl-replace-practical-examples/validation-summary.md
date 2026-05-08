# Validation Summary: How to Use calicoctl replace with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico FelixConfiguration
- Calico IPPool
- Calico BGPConfiguration
- Bash scripting

## Sources Consulted
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl replace reference: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico IP pool block size change guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size

## Issues Found
- The FelixConfiguration example used `reportingInterval`, which is not a valid `FelixConfiguration` resource field in current Calico Open Source documentation. Changed it to the valid `usageReportingInterval: 24h0m0s`.
- The FelixConfiguration example used `flowLogsFlushInterval`, which is not documented as a valid Calico Open Source `FelixConfiguration` resource field. Removed it from the example.
- The examples saved resources for replacement without `--export`. Official Calico docs recommend exporting resource YAML for replacement so cluster-specific metadata is stripped. Added `--export` to the backup/current-state commands.
- The scripted workflow depended on Python's third-party `yaml` module even though the prerequisites did not include PyYAML. Reworked the script to use `calicoctl get -f "$RESOURCE_FILE" -o yaml --export` and `calicoctl get -f "$RESOURCE_FILE" -o yaml` instead of parsing YAML metadata in Python.

## Review Notes
The `calicoctl` CLI reference notes that the client and cluster versions should normally match. The post's `calicoctl v3.27 or later` prerequisite is broadly reasonable for these commands, but operators should still use a `calicoctl` version compatible with their installed Calico cluster.
