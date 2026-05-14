# Validation Summary: Cilium CRD Validation: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy CustomResourceDefinitions
- Kubernetes CustomResourceDefinitions
- Kubernetes OpenAPI v3 schema validation
- kubectl server-side dry run
- cilium-dbg preflight validation
- jq
- Mermaid

## Sources Consulted
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Network Policy overview: https://docs.cilium.io/en/stable/security/policy/
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium-dbg/
- Cilium cilium-dbg preflight validate-cnp reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_preflight_validate-cnp/

## Issues Found
- The prerequisites referenced `cilium-cli` for advanced policy testing, but the validation command available in current Cilium documentation is `cilium-dbg preflight validate-cnp` inside Cilium pods. Updated the prerequisite to reference `cilium-dbg` access.
- The CRD check comments implied validation is enabled by a Cilium version and that a `served` check proves validation enforcement. Updated the wording to accurately describe checking the OpenAPI v3 schema and served CRD version.
- The structural schema comment said "Enable structural schema validation" even though the command only checks status. Updated it to "Check structural schema status."
- The protocol validation note only allowed TCP or UDP. Cilium L4 policy documentation also accepts values such as SCTP and ANY, so the note now says to use accepted uppercase values such as TCP, UDP, SCTP, or ANY.
- The policy trace example used outdated `cilium policy trace` syntax and flags. Replaced it with the current documented `cilium-dbg preflight validate-cnp` command for deployed CiliumNetworkPolicy validation.
- The Mermaid flow showed the Cilium Operator distributing policies to agents. Cilium documentation describes Kubernetes distributing policies to agents, so the diagram now has Cilium agents watching the stored policy.
- The conclusion recommended Cilium policy trace as the semantic validation step. Updated it to recommend deployed policy checks and traffic tests.
- The unknown-field error example used older `ValidationError` wording. Updated it to a current-style strict decoding error example.

## Review Notes
The guide is technically relevant and useful as a validation workflow. Server-side dry run validates against the live API server schema, but it still requires access to a cluster with the Cilium CRDs installed. Semantic policy intent still needs traffic-level verification beyond schema validation.
