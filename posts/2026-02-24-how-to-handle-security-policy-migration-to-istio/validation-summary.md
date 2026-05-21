# Validation Summary: How to Handle Security Policy Migration to Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes NetworkPolicy
- Kubernetes RBAC
- Kubernetes Pod Security Admission and legacy PodSecurityPolicy
- Istio PeerAuthentication and mTLS
- Istio AuthorizationPolicy
- Istio RequestAuthentication and JWT validation
- kubectl
- istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio security concepts, including mTLS and authorization policy dependencies: https://istio.io/latest/docs/concepts/security/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/

## Issues Found
- The post described the migration path as replacing Kubernetes NetworkPolicies with Istio AuthorizationPolicies. This was too strong because NetworkPolicies and Istio policies apply at different layers and Istio policies only cover traffic handled by Istio proxies. Changed the wording to recommend adding Istio policies that mirror or refine NetworkPolicies, then evaluating removals later.
- The security posture commands grouped PodSecurityPolicy and Pod Security Standards together, but PodSecurityPolicy was removed in Kubernetes v1.25 and Pod Security Admission is configured through namespace labels. Added a legacy qualifier for PodSecurityPolicy and a namespace-label check for Pod Security Admission.
- The example AuthorizationPolicy was presented as equivalent to a pod-label NetworkPolicy, but it matches a service account principal. Added the assumption that frontend pods run as the `frontend` service account.
- The mTLS verification commands relied on generic listener output and proxy stats. Replaced them with documented `istioctl proxy-config secret` usage for workload certificates and kept listener inspection for TLS transport sockets.
- The JWT section said to add validation "at the mesh level" while the example uses a workload selector in the `production` namespace. Changed the wording to "to the selected workload."

## Review Notes
- The Istio `security.istio.io/v1` API examples are current for Istio 1.30 documentation.
- The default-deny AuthorizationPolicy with an empty spec is valid and documented by Istio as allowing nothing for the policy target.
- The `principals`, `namespaces`, and `requestPrincipals` examples are valid, but the source identity fields should be used with strict mTLS to avoid policy bypass or unexpected rejection, as Istio documents.
