# Validation Summary: How to Deploy PodSecurityPolicies with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PodSecurityPolicy
- Kubernetes Pod Security Admission
- Kubernetes Pod Security Standards
- Argo CD Applications and automated sync
- Kyverno ClusterPolicy
- OPA Gatekeeper ConstraintTemplate
- Kubernetes YAML manifests

## Sources Consulted
- Kubernetes PodSecurityPolicy deprecation documentation: https://kubernetes.io/docs/concepts/policy/pod-security-policy/
- Kubernetes PodSecurityPolicy deprecation blog: https://kubernetes.io/blog/2021/04/06/podsecuritypolicy-deprecation-past-present-and-future/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels
- Argo CD declarative Application setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kyverno installation documentation: https://kyverno.io/docs/installation/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno disallow latest tag policy example: https://release-1-13-0.kyverno.io/policies/best-practices/disallow-latest-tag/disallow-latest-tag/
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/next/install/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/

## Issues Found
- The timeline said PodSecurityPolicies were available from Kubernetes 1.0 to 1.24. Kubernetes documentation states PodSecurityPolicy has been the built-in mechanism since Kubernetes 1.3, so the timeline was corrected to "Kubernetes 1.3 to 1.24".
- The Restricted Pod Security Standard description said read-only root filesystems are required. Kubernetes Restricted PSS does not require `readOnlyRootFilesystem`; it requires controls such as non-root execution, seccomp, disabled privilege escalation, and dropping capabilities. The wording was corrected.
- The comments for `audit: restricted` and `warn: restricted` described "baseline violations". These labels report restricted-level violations, so the comments were corrected.
- The Argo CD self-heal explanation said labels are restored immediately. Argo CD attempts self-healing after drift detection and its configured self-heal interval, so the wording was made accurate.
- The Kyverno policies used deprecated top-level `spec.validationFailureAction`. Current Kyverno documentation recommends `spec.rules[*].validate.failureAction`, so the examples were updated.
- The Kyverno Argo CD Application was missing sync options recommended by Kyverno's Argo CD notes. Added `CreateNamespace=true` and `Replace=true`.
- The Gatekeeper Argo CD Application did not create the destination namespace. Added `CreateNamespace=true`, matching the Helm installation requirement to create `gatekeeper-system` when needed.

## Review Notes
The post is technically relevant and reviewable. I validated the examples against official documentation, but this environment did not have `kubectl`, `kubeconform`, `yq`, or Ruby available, so I could not run a live Kubernetes schema validation pass locally.
