# Validation Summary: How to Test Network Policies with Calico on OpenShift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenShift
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- OpenShift `oc` CLI
- `calicoctl`

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- OpenShift Container Platform 4.18 Network security documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html-single/network_security/network-policy
- OpenShift Container Platform networking documentation for project template NetworkPolicy examples: https://docs.redhat.com/en/documentation/openshift_container_platform/4.7/html/networking/network-policy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/about-network-policy
- Calico policy ordering and tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico `calicoctl delete` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete

## Issues Found
- The post stated that OpenShift adds default NetworkPolicy objects to every new project namespace. Red Hat documents these as policies an administrator creates directly or adds to the project request template, not unconditional platform-created defaults. Updated the wording and commands to inspect the actual test namespace after project creation.
- The first inspection command checked the `default` namespace before creating the test namespaces. Changed the flow to create `policy-test-a` and `policy-test-b` first, then inspect `policy-test-a` for any template-created NetworkPolicy objects.
- The original workload used the default `nginx` image on port 80, which commonly fails under OpenShift restricted security defaults because the image expects root-oriented filesystem and port behavior. Replaced it with `quay.io/openshift/origin-hello-openshift` on port 8080 and updated the service and test URLs.
- The `oc run` client commands passed `sleep 3600` without `--command`, which can be ambiguous because arguments after `--` are otherwise treated as container arguments. Added `--command -- sleep 3600`.
- The BusyBox `wget` examples used `--timeout=5`, which is not portable across BusyBox builds. Changed the examples to use `-T 5`.
- The GlobalNetworkPolicy allowed all ingress from the source namespace even though the test only needs HTTP to the server. Added `protocol: TCP` and destination port `8080` to match the test workload.
- The egress policy hard-coded `10.128.0.0/14` without noting that OpenShift cluster network CIDRs are configurable. Added a command to inspect the cluster network CIDR and a note to replace the example value if needed.

## Review Notes
The post is technically relevant and includes runnable commands and Calico policy YAML. On clusters where the project template does not install ingress-isolating NetworkPolicy objects, the cross-namespace baseline test will not be blocked until an ingress-isolating policy is added to the target namespace.
