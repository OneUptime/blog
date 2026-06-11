# Validation Summary: How to Create OPA Gatekeeper Mutation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OPA Gatekeeper
- Kubernetes admission webhooks
- Gatekeeper mutation CRDs: Assign, AssignMetadata, ModifySet, AssignImage
- Helm
- kubectl
- gator CLI

## Sources Consulted
- Gatekeeper Mutation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/mutation/
- Gatekeeper Background Information on Mutation: https://open-policy-agent.github.io/gatekeeper/website/docs/mutation-background/
- Gatekeeper Runtime Flags: https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/
- Gatekeeper gator CLI documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/gator/
- Gatekeeper Helm chart README: https://github.com/open-policy-agent/gatekeeper/blob/master/charts/gatekeeper/README.md
- Gatekeeper CRD schemas in the official repository: https://github.com/open-policy-agent/gatekeeper/tree/master/config/crd/bases

## Issues Found
- The post stated Gatekeeper has three mutation types. Current Gatekeeper documents four mutators: AssignMetadata, Assign, ModifySet, and AssignImage. Added AssignImage and corrected the ModifySet use case.
- The installation section used outdated Helm values (`mutations.enabled` and `mutatingWebhookConfigurationFailurePolicy`) and said mutation is disabled by default. Current Helm chart values use `disableMutation` and `mutatingWebhookFailurePolicy`, with mutation enabled unless disabled. Updated the install and upgrade commands.
- The existing-installation patch used `--mutation-enabled=true`, but the current runtime flag is deprecated and has no effect. Replaced the patch with a Helm upgrade command.
- The post described a deterministic mutation order, alphabetical ordering, and a `priority` field. These are not supported by the current public CRD schema. Reworked the section to focus on convergent, non-overlapping mutations and `pathTests`.
- The location path examples showed numeric array indexing (`spec.containers[0]`), which is not part of the documented Gatekeeper mutation path syntax. Removed those examples.
- The ExpansionTemplate example omitted `applyTo`, which is required for identifying workload resources to expand. Added `applyTo`.
- The Gator section used `gator verify` as if it could directly test mutation CRs as suites. Official docs describe `gator verify` for validation constraints and `gator expand` for expansion configs with optional mutation CRs. Replaced the example with `gator expand`.
- The debugging command listed only three mutator resources. Added `assignimage`.

## Review Notes
The remaining examples use current `mutations.gatekeeper.sh/v1` APIs for Assign, AssignMetadata, and ModifySet and follow the documented `applyTo`, `match`, `location`, `parameters.assign`, `parameters.pathTests`, and `parameters.values.fromList` shapes. The post does not specify a Gatekeeper version; the review used the current v3.22.x documentation and the current master chart/CRD schemas as of 2026-06-11.
