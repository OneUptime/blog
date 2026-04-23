# Validation Summary: How to Configure Rancher HA with F5 - With

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager HA
- F5 BIG-IP LTM
- TMSH CLI
- FastL4
- HTTPS health monitors
- Source-address persistence
- RKE2 control-plane load balancing

## Sources Consulted
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher HA RKE2 setup: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- Rancher Port Requirements: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- F5 `ltm monitor https` reference: https://clouddocs.f5.com/cli/tmsh-reference/v15/modules/ltm/ltm_monitor_https.html
- F5 `ltm pool` reference: https://clouddocs.f5.com/cli/tmsh-reference/v16/modules/ltm/ltm_pool.html
- F5 `ltm virtual` reference: https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/ltm/ltm_virtual.html
- F5 `ltm profile fastl4` reference: https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/ltm/ltm_profile_fastl4.html
- F5 `ltm persistence source-addr` reference: https://clouddocs.f5.com/cli/tmsh-reference/v15/modules/ltm/ltm_persistence_source-addr.html

## Issues Found
- The post description referenced iRules and SSL offloading, but the configuration shown was FastL4 SSL passthrough and did not use iRules. I updated the description, Step 4 heading, and conclusion so they match the actual configuration.
- Several `tmsh` examples were written as brace-delimited multi-line shell snippets that do not parse as valid `bash`. I rewrote those commands as shell-safe `tmsh` invocations with line continuations.
- The pool examples used `least-connections-member`, but the documented BIG-IP load-balancing mode is `least-connections-members`. I corrected the mode in both pool definitions.
- The pool, virtual server, and persistence commands omitted the documented `members add`, `profiles replace-all-with`, and `persist replace-all-with` forms. I updated the commands to the current TMSH syntax from the F5 references.
- The health monitor looked for `ok` in the response body, while the Rancher docs only guarantee an HTTP `200` response from `/healthz`. I changed the monitor to match `200` and explicitly inherit from the default HTTPS monitor.
- The FastL4 profile used a 300-second idle timeout, which is shorter than Rancher's documented long-lived websocket guidance. I increased the timeout to `1800` seconds.
- The Kubernetes API section implied that port `6443` alone was the required extra listener for an HA RKE2 management cluster. I corrected this to show that RKE2 HA requires both `9345` and `6443` when the same BIG-IP fronts the control plane.
- The persistence section said source-IP persistence keeps agents on the same Rancher pod. That is inaccurate for a BIG-IP balancing to Rancher nodes. I changed the text to describe it as optional affinity to the same Rancher node behind the VIP.

## Review Notes
- Rancher documents Layer 4 forwarding of both `80/tcp` and `443/tcp` to the management cluster nodes for the main Rancher entrypoint. The post now notes that port `80` is commonly forwarded for HTTP-to-HTTPS redirect behavior.
- Rancher requires long-lived WebSocket support from the load balancer. Source-address persistence can be useful on BIG-IP, but it is an optional affinity choice rather than a documented Rancher requirement.
