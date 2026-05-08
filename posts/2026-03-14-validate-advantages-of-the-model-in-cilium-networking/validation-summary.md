# Validation Summary: Validating Advantages of the Encapsulation Model in Cilium

## Status
validated

## Post Type
Tutorial / Validation guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium agent debug CLI (`cilium-dbg`)
- Hubble
- Kubernetes
- Helm
- YAML manifests

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium agent debug command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium agent debug command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Kubernetes workload and Service API conventions: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ and https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The introduction overstated encapsulation as working on "any network infrastructure" and preventing all pod IP conflicts. Cilium's routing documentation says encapsulation still requires node-to-node connectivity and tunnel UDP ports, and that the underlay does not need to know PodCIDRs. Updated the wording to reflect those requirements and benefits accurately.
- The post used `cilium endpoint list` and `cilium metrics list`, but endpoint and metrics inspection inside Cilium agent pods is provided by `cilium-dbg endpoint list` and `cilium-dbg metrics list` in the official command reference. Updated those commands.
- The endpoint-count check claimed Cilium endpoints should match running pods. Cilium's Endpoint CRD documentation notes that Cilium also creates health endpoints, and some pods may not be Cilium-managed. Updated the text to compare counts instead of requiring an exact match.
- The DNS connectivity-test selector used `dns-resolution`, which is not the commonly documented Cilium connectivity-test scenario name. Updated it to `dns-only`, matching Cilium connectivity test output examples.

## Review Notes
The Kubernetes Deployment and Service manifests are syntactically valid. The guide is version-neutral; command behavior can still vary across Cilium CLI releases because `cilium connectivity test --test` selects tests by regular expression against available scenario names.
