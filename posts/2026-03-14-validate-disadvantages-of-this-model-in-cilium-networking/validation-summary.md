# Validation Summary: Validating Disadvantages of Native Routing in Cilium

## Status
validated

## Post Type
Technical validation guide

## Technologies Covered
- Cilium native routing
- Cilium CLI and cilium-dbg
- Kubernetes workloads and Services
- CiliumEndpoint and CiliumNode custom resources
- Hubble observability
- Helm

## Sources Consulted
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium end-to-end connectivity testing documentation: https://docs.cilium.io/en/stable/contributing/testing/e2e.html
- Cilium troubleshooting documentation for cilium-dbg endpoint inspection: https://docs.cilium.io/en/stable/operations/troubleshooting/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble setup and CLI validation documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium cluster-pool IPAM documentation for CiliumNode PodCIDRs: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool.html

## Issues Found
- The native-routing route check used `ip route show proto bird`, which is specific to BIRD-routed environments and is not a general Cilium native-routing validation. Replaced it with checks for relevant Cilium configuration keys and CiliumNode PodCIDRs.
- The selected connectivity tests included overly specific or uncertain test names. Updated them to regex patterns documented by `cilium connectivity test --test`.
- The BusyBox `wget --timeout=5` examples were not portable for the BusyBox image. Replaced them with BusyBox-compatible `wget -T 5`.
- The endpoint and metrics examples used `cilium endpoint list` and `cilium metrics list`; current Cilium agent-pod debugging documentation uses `cilium-dbg endpoint list` and `cilium-dbg metrics list`. Updated those commands.
- The endpoint count was described as matching running pod count, but CiliumEndpoint resources can include Cilium health endpoints. Changed the wording to compare counts instead of requiring an exact match.
- The Hubble command was shown as running inside the Cilium DaemonSet. Updated it to the documented Hubble CLI access pattern using `hubble observe -P` and added the Hubble CLI prerequisite.

## Review Notes
The guide is technically relevant and the remaining Kubernetes manifests use current `apps/v1` Deployment and `v1` Service APIs. The examples are still environment-dependent: native routing requires the underlying network, cloud routes, or BGP/static routing to carry PodCIDRs, and Hubble flow validation requires Hubble Relay/API access.
