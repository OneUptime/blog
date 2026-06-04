# Validation Summary: How to Use Pulumi Policy Packs for Kubernetes Resource Compliance Enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi Policy Packs / CrossGuard
- Pulumi CLI
- Pulumi TypeScript Policy SDK (`@pulumi/policy`)
- Pulumi Kubernetes provider (`@pulumi/kubernetes`)
- Kubernetes Pods, Deployments, Services, ConfigMaps, NetworkPolicies, security contexts, and resource quantities
- TypeScript
- JSON policy configuration

## Sources Consulted
- Pulumi Policy CLI Reference: https://www.pulumi.com/docs/insights/policy/cli/
- Pulumi policy pack authoring guide: https://www.pulumi.com/docs/insights/policy/policy-packs/authoring/
- Pulumi Policies overview: https://www.pulumi.com/docs/insights/policy/
- Pulumi Policy SDK API reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/policy/
- `@pulumi/policy` 1.21.0 package type definitions from npm
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The post implied all policies run during both `pulumi preview` and `pulumi up` before cloud API calls. Pulumi documents this behavior for resource validation policies, while stack validation policies run after resource registration and only during `pulumi up`. Updated the general explanation and the stack validation section to distinguish the two scopes.
- The setup commands used the AWS TypeScript policy template but then imported `@pulumi/kubernetes` without installing it. Added `npm install @pulumi/kubernetes` and clarified the dependency note.
- The Kubernetes quantity parsing helpers did not handle several valid memory/storage suffixes (`Ti`, `Pi`, `Ei`, and decimal large-unit suffixes), and treated unsuffixed quantities as MiB/GiB instead of bytes. Updated the helpers to convert supported Kubernetes suffixes more accurately.

## Review Notes
- Pulumi was not installed in the local workspace, so CLI behavior was verified against official Pulumi documentation instead of local `pulumi --help` output.
- The examples intentionally focus on directly declared `Pod` resources. In production policy packs, teams commonly add equivalent checks for workload controllers such as Deployments, StatefulSets, DaemonSets, and Jobs by inspecting their pod templates.
