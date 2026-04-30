# Validation Summary: How to Automate IPv6 Change Management Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- BGP
- Git-based change management
- GitHub Actions
- Python
- NAPALM
- Netmiko
- YAML

## Sources Consulted
- RFC 3849: IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/rfc/rfc3849
- GitHub Docs: Workflow syntax for GitHub Actions — https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- `actions/checkout` README — https://github.com/actions/checkout
- `actions/setup-python` README — https://github.com/actions/setup-python
- NAPALM: Changing the Configuration — https://napalm.readthedocs.io/en/latest/tutorials/changing_the_config.html
- NAPALM: NetworkDriver API (`get_bgp_neighbors`, `rollback`, commit-confirm methods) — https://napalm.readthedocs.io/en/latest/base.html
- NAPALM: Supported Devices and configuration support matrix — https://napalm.readthedocs.io/en/latest/support/
- NAPALM: IOS driver caveats and rollback prerequisites — https://napalm.readthedocs.io/en/latest/support/ios.html
- Cisco IOS XE 17.14.x: Implementing Multiprotocol BGP for IPv6 — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9600/software/release/17-14/configuration_guide/rtng/b_1714_rtng_9600_cg/implementing_multiprotocol_bgp_for_ipv6.html
- Local `ping -h` output from iputils on the review environment

## Issues Found
1. The post used arbitrary IPv6 literals in documentation examples. I replaced them with `2001:db8::/32` addresses, which RFC 3849 reserves for documentation, and updated the rollback plan and health checks to match.
2. The BGP config example did not activate the IPv6 address family, so it was incomplete for IOS-style multiprotocol BGP configuration. I added `address-family ipv6 unicast` and `neighbor ... activate`, matching Cisco's documented IPv6 BGP workflow.
3. The validation script would crash on malformed YAML or a missing CLI argument and did not validate device metadata needed by the deployment example. I added YAML/argument error handling and device-field checks so the script fails predictably.
4. The GitHub Actions workflow could never run the `deploy` job because the workflow only triggered on `pull_request` while the job required a `push` to `main`. I added the `push` trigger, updated the action versions to the current documented `v6` major versions, added the recommended `contents: read` permission, enabled pip caching, and made the file iteration match the documented `changes/**/*.yml` path scope.
5. The deployment example used one `device` object for every listed device, referenced an undefined `run_health_check`, and manually restored config snapshots instead of using NAPALM's documented rollback and commit-confirm flow. I rewrote the example to open devices by platform, verify BGP state using `get_bgp_neighbors()`, use `commit_config(revert_in=300)`, call `confirm_commit()` after successful checks, and `rollback()` on failure.
6. The introduction and conclusion stated automatic rollback too broadly. I narrowed that wording to commit-confirm rollback on supported platforms, which matches NAPALM's support matrix and configuration tutorial.

## Review Notes
- The deployment example now assumes the change file includes per-device `platform`, `hostname`, and `username` fields and that `NETWORK_PASSWORD` is provided by the CI environment.
- NAPALM commit-confirm is platform-dependent. The support matrix documents it for EOS, Junos, and IOS, but not every driver supports it.
- For the IOS example specifically, NAPALM documents additional prerequisites such as rollback support on the target IOS release and enabling archive/SCP-related workflow requirements before configuration replace/rollback operations will work reliably.
