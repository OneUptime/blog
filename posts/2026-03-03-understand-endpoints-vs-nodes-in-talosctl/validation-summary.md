# Validation Summary: How to Understand Endpoints vs Nodes in talosctl

## Status
validated

## Post Type
Guide

## Technologies Covered
- Talos Linux
- talosctl
- Talos API endpoints and node targeting
- talosconfig

## Sources Consulted
- Sidero Labs Talos v1.13 talosctl learn-more documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/talosctl
- Sidero Labs Talos latest CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs Talos talosconfig reference: https://docs.siderolabs.com/talos/v1.11/reference/talosconfig
- Sidero Labs Talos v1.9 getting started documentation for `--insecure`: https://docs.siderolabs.com/talos/v1.9/getting-started/getting-started
- Sidero Labs Talos v1.13 production cluster documentation: https://docs.siderolabs.com/talos/v1.13/getting-started/prodnotes

## Issues Found
- The post used `talosctl services`, but the current CLI command is `talosctl service`. Updated the examples to use `talosctl service`.
- The post said multiple endpoints are tried in order. Official documentation says talosctl automatically load balances and fails over between endpoints. Updated the explanation.
- The post described endpoints as machines, which was too narrow because endpoints can also be load balancers, DNS names, or VIPs. Updated the wording to describe them as Talos API addresses.
- The insecure-mode explanation said talosctl ignores the endpoint setting. Official documentation states that an endpoint cannot be specified with `--insecure` and the node must be accessed directly on port 50000. Updated the text to match.
- The command-line override section incorrectly treated `TALOSCONFIG` as an endpoint/node value source. Updated it to distinguish endpoint/node resolution from talosconfig file selection.
- The worker-node endpoint warning cited different trust relationships. Official documentation says endpoints need to be members of the same Talos cluster as the target node because proxied connections rely on certificate-based authentication. Updated the warning.

## Review Notes
The main endpoint/node proxy model, use of `--endpoints` and `--nodes`, talosconfig fields, and first-time `apply-config --insecure --nodes ... --file ...` example are consistent with the official documentation reviewed.
