# Validation Summary: How to Configure Routing Policy with Netplan

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Netplan (YAML network configuration renderer for Ubuntu/Linux)
- Linux policy-based routing (`ip rule`, custom routing tables)
- iproute2 (`ip rule list`, `ip route show table`, `ip route get`)
- Ubuntu networking

## Sources Consulted
- Netplan YAML reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan reference for `routing-policy` and `routes` keys
- iproute2 manual pages (`ip-rule(8)`, `ip-route(8)`)

## Issues Found
No technical issues found.

All examined claims and configuration items match the official Netplan reference:

- The `routing-policy` key is valid under each interface, with the documented fields `from`, `to`, `table`, `priority`, `mark`, and `type-of-service`.
- The `routes` key supports `to`, `via`, `table`, `metric`, etc., as used in the examples.
- The statement that lower `priority` numbers are checked first is consistent with the docs ("rules are processed in order by increasing priority number").
- The CLI commands (`netplan apply`, `ip rule list`, `ip route show table 100`, `ip route get 8.8.8.8 from 10.0.0.10`) are syntactically valid and produce the described output.
- ToS value `16` and `mark: 1` are valid positive integer matches for the respective fields.

## Review Notes
- The directly-connected on-link route in the examples (`to: 10.0.0.0/24, via: 10.0.0.1`) is unconventional — the more idiomatic form is `to: 10.0.0.0/24, scope: link` to place the connected route into a custom table. The form shown is still accepted by Linux/Netplan and the example will work in practice, so no change was made.
- The `routing-policy` section in "Multi-Homing with Two ISPs" omits `priority`, which is fine (Netplan/kernel will assign one), but in real deployments specifying explicit priorities per ISP is recommended for predictability.
- Netplan version is not pinned in the post; the `routing-policy` schema described has been stable since Netplan 0.95+ and is current as of Ubuntu 22.04/24.04.
