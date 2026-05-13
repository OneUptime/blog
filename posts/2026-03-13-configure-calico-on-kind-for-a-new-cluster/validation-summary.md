# Validation Summary: How to Configure Calico on Kind for a New Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes custom resources
- Kind
- Kubernetes networking and CNI

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl configuration documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico v3.27.0 manifest defaults: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
- Kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/

## Issues Found
- The post claimed the guide configured BGP settings and node-to-node mesh settings, but the commands only configure IPPool and Felix resources. I narrowed the wording to the features actually covered.
- The post used `kubectl patch felixconfiguration default --type merge --patch '{"spec":{"ipipEnabled":false}}'` as the way to disable IPIP encapsulation. Calico's IP-in-IP routing behavior is controlled by the IPPool `ipipMode`, while Felix `ipipEnabled` only overrides whether Felix configures an IPIP interface. I changed the command to patch `default-ipv4-ippool` with `ipipMode: Never`.
- The post stated unconditionally that the default pool uses CIDR `192.168.0.0/16` with IPIP enabled. I clarified that this is true for the v3.27 manifest defaults when the default pool settings are not changed during installation.
- The CrossSubnet IPPool example did not explicitly set `vxlanMode: Never`. Because Calico IPPools cannot use `ipipMode` and `vxlanMode` at the same time except with the unused mode set to `Never`, I added `vxlanMode: Never` to make the intended mode explicit.
- The prerequisite wording implied `v3.27.0` is always the correct calicoctl version. I changed it to say `v3.27.0` is appropriate when the cluster is running Calico `v3.27.0`.
- The Felix section described the settings as performance tuning. I changed the wording to local Kind cluster tuning, since `logSeverityScreen: Info` is the documented default and `reportingInterval: 0s` disables Felix datastore status reporting rather than serving as a general performance recommendation.

## Review Notes
- The post assumes a manifest-based Calico v3.27 installation. Operator-based installations can use different defaults, such as VXLAN encapsulation, so future updates should state the installation method more explicitly.
