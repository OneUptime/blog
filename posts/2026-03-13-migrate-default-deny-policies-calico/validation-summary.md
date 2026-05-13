# Validation Summary: How to Migrate Existing Rules to Calico Default Deny Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source, Calico Cloud, and Calico Enterprise
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico flow logs, Goldmane, and Whisker
- kubectl and calicoctl

## Sources Consulted
- Calico Open Source: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico Open Source: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source: Enable the flow logs API and Calico Whisker - https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source: View flow logs in the Calico Whisker web console - https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source: Stage, preview impacts, and enforce policy - https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Open Source: calicoctl user reference and get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/overview and https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes NetworkPolicy documentation - https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The prerequisites listed Calico v3.26+ while the post depended on Calico Open Source flow logs. Current Calico Open Source documentation describes Goldmane and Whisker flow logs as installed by default for new Calico Open Source 3.30+ operator or Helm installations, so the prerequisite was updated to Calico v3.30+ for Calico Open Source flow logs, or Calico Cloud/Enterprise flow logs.
- The flow log enablement command used a non-documented `flowLogsEnabled` field on `FelixConfiguration`. Replaced it with the documented Goldmane and Whisker custom resources for Calico Open Source operator or Helm installations.
- The Calico NetworkPolicy conversion matched destination port 8080 without declaring the protocol. The equivalent Kubernetes NetworkPolicy defaults the port protocol to TCP, so `protocol: TCP` was added to preserve the same behavior.
- The default-deny command sequence applied the global deny policy before running traffic tests, while the migration flow and Calico guidance recommend validating allow coverage before enforcing deny behavior. Reordered the commands to run tests first, then apply the default deny policy only if tests pass.
- The default deny command comment did not mention scope. Updated it to specify that the global default deny should be scoped to non-system namespaces, matching Calico's documented best practice.

## Review Notes
The post remains a high-level migration guide. In a future revision, it could include a concrete `global-default-deny.yaml` example with DNS allowances and explicit namespace exclusions, because Calico's documentation warns that an overly broad global default deny can affect system and control-plane namespaces.
