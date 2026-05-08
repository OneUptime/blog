# Validation Summary: Validate IP Reservation in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- Calico `IPReservation` and `IPPool` resources
- `calicoctl`
- Kubernetes pod annotations

## Sources Consulted
- Calico Open Source IP reservation resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico Open Source specific pod IP documentation: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico Open Source CNI plugin annotation documentation: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico Open Source `calicoctl ipam` command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source `calicoctl ipam release` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool

## Issues Found
- The post described using `IPAMConfig` or direct block manipulation for reservations. Updated it to use the documented `IPReservation` resource with `spec.reservedCIDRs`.
- The initial YAML used a disabled `IPPool` as the primary reservation mechanism for a range inside a pool. Replaced it with `IPReservation`, which is the documented resource for reserving small parts of an IP pool.
- The post used `calicoctl ipam allocate --ip ... --handle ... --note`, but the current documented `calicoctl ipam` subcommands do not include `allocate`. Replaced the handle-based workflow with an `IPReservation` manifest and `calicoctl apply`.
- The validation and audit commands relied on `calicoctl ipam show --show-handles` for reservations. Updated them to read `IPReservation` resources instead.
- The post claimed that requesting a reserved IP with `cni.projectcalico.org/ipAddrs` should fail or receive a different IP. Calico documentation states that manual IP annotations override `IPReservation`, so the test was corrected to validate that behavior.
- Updated wording throughout the post to clarify that `IPReservation` blocks automatic assignment, not all possible manual assignment.
- Updated the best-practice note for reserving a whole pool to use a separate IP pool with a node selector such as `"!all()"`, matching Calico's documented guidance for manual assignments.

## Review Notes
The shell commands are examples and were not executed against a live Calico cluster in this environment because `calicoctl` is not installed locally. The commands and resource fields were checked against current official Calico documentation.
