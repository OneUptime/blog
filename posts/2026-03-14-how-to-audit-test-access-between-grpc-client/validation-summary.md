# Validation Summary: Auditing gRPC Client-Server Access in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumEndpoint and CiliumIdentity CRDs
- Kubernetes
- Hubble CLI
- gRPC
- jq
- Bash

## Sources Consulted
- Cilium Securing gRPC documentation: https://docs.cilium.io/en/stable/security/grpc/
- Cilium Network Policy language documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium command reference for `cilium-dbg config`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium API reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api/
- Cilium Helm values reference for policy enforcement mode: https://docs.cilium.io/en/stable/helm-values/

## Issues Found
- The policy coverage commands used `cilium endpoint list`, which is not a current Kubernetes-facing Cilium CLI command. Replaced these examples with `kubectl get ciliumendpoints --all-namespaces -o json`, which Cilium documents as the cluster-wide endpoint source.
- The policy coverage filters checked `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`, but the documented policy fields are under `realized.l4.ingress` and `realized.l4.egress`, and overall enforcement is exposed as `realized."policy-enabled"`. Updated the audit logic to use `policy-enabled` and avoid counting missing status as covered.
- The configuration consistency example ran `cilium config view` inside Cilium agent pods. Updated the node-local inspection command to use `cilium-dbg config --all`, which is the documented agent CLI command.
- The configuration grep used `enable-l7`, which is not the documented/current option name. Updated the configuration checks to use `enable-l7-proxy` and documented policy/Hubble-related keys.
- The policy example claimed to include audit annotations but had no annotations. Added minimal audit annotations.
- The policy example only allowed TCP port 50051 and did not demonstrate gRPC method-level control. Added a Cilium HTTP L7 rule for a gRPC POST path, matching Cilium's documented gRPC enforcement model.
- The verification examples used `cilium policy get` and `cilium identity list`, which are agent-local/debug CLI patterns rather than current cluster-level CLI examples. Replaced them with `kubectl get cnp,ccnp` and `kubectl get ciliumidentities`.
- The troubleshooting command looked for an `Enforcement` string in `kubectl describe cnp`, which is not a reliable policy status check. Replaced it with a JSON status inspection command.

## Review Notes
The post is now technically valid as a practical audit guide. Some commands still require a live Cilium cluster with the Cilium CRDs installed, Hubble enabled for flow inspection, and sufficient RBAC permissions to read Cilium resources across namespaces.
