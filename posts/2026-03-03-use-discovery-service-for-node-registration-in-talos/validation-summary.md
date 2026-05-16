# Validation Summary: How to Use Discovery Service for Node Registration in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos discovery service
- Talos service and Kubernetes discovery registries
- KubeSpan
- Kubernetes node membership
- talosctl
- kubectl

## Sources Consulted
- Talos Discovery Service documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/discovery
- Talos KubeSpan documentation: https://docs.siderolabs.com/talos/v1.12/networking/kubespan/
- Talos machine configuration reference for discovery registries: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos troubleshooting documentation for discovery membership and removed members: https://docs.siderolabs.com/talos/v1.11/troubleshooting/troubleshooting
- Public Talos discovery service information page: https://discovery.talos.dev/

## Issues Found
- The post used invalid or outdated resource names such as `kubespanidentity`, `discoveredmembers`, and `clusteridentity`. Updated the examples to current Talos resources: `identities`, `affiliates`, and `members`.
- The post described discovery traffic as simple POST and GET operations. Official documentation describes publishing and reading encrypted affiliate data over TCP 443, so the protocol wording was corrected without asserting specific HTTP methods.
- The Kubernetes registry was presented as a normal redundancy option. Current Talos documentation says the Kubernetes registry is disabled by default and deprecated for Kubernetes 1.32+ default authorization behavior, so the post now includes that caveat.
- The bootstrap section overstated that discovery replaces manually specifying all control plane addresses. Updated it to match Talos documentation: discovery helps endpoint resolution, but Talos can operate without it with greater dependence on configured endpoints and Kubernetes API availability.
- The large-cluster section made an unsupported claim that 1000-node discovery responses are manageable. Replaced it with a conservative scale note and corrected the JSON counting command to use `.items | length`.
- The deregistration section said reset registrations only expire on their own. Talos documentation says a reset node removes itself from discovery, while unreset stale members expire after the TTL, so the text now reflects both cases.
- The security section said the cluster ID is derived from cluster secrets. Official documentation describes the cluster ID as a random value generated as part of cluster secrets, while decryption requires the cluster secrets. The wording was corrected.

## Review Notes
The article is technically relevant and remains a useful guide after correction. Future improvements could mention the hardcoded 30-minute discovery TTL and the `cluster-raw` namespace earlier when explaining how to distinguish service-registry data from Kubernetes-registry data.
