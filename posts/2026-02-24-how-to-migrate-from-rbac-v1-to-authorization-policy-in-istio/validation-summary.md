# Validation Summary: How to Migrate from RBAC v1 to Authorization Policy in Istio

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio RBAC v1alpha1
- Istio AuthorizationPolicy
- Kubernetes custom resources
- kubectl

## Sources Consulted
- Istio: Migrate pre-Istio 1.4 Alpha security policy to the current APIs: https://istio.io/latest/blog/2021/migrate-alpha-policy/
- Istio: Introducing the Istio v1beta1 Authorization Policy: https://istio.io/latest/blog/2019/v1beta1-authorization-policy/
- Istio: Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio: Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio 1.6 Upgrade Notes: https://istio.io/latest/news/releases/1.6.x/announcing-1.6/upgrade-notes/
- Istio: Introducing Istio v1 APIs: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post said `ClusterRbacConfig` was simply not needed because policies are always active. Updated this to explain that AuthorizationPolicy is evaluated when policies exist, and that ALLOW policies deny unmatched requests for the selected workloads.
- The mapping table mapped `ClusterRbacConfig` to "not needed". Updated it to mention policy placement and empty policy specs for preserving old default-deny behavior.
- The mapping table mapped `ServiceRoleBinding.spec.subjects[].group` to `requestPrincipals`, which is not the documented migration mapping. Updated it to `request.auth.claims[group]` in a `when` condition.
- The post did not explain that `principals` and `namespaces` are peer identity fields and require mTLS. Added a short caveat and pointed JWT identity matching to `requestPrincipals` or `request.auth.claims[...]`.
- The inventory and deletion commands used short custom resource names. Updated them to the official fully qualified resource names used in Istio upgrade documentation.
- The post did not mention that a `ServiceRole` listing multiple services may need multiple AuthorizationPolicy resources because AuthorizationPolicy has one workload selector. Added that caveat.
- The `ClusterRbacConfig` migration guidance for namespace-level enforcement was incomplete. Added an empty `spec: {}` policy example to preserve old default-deny behavior.
- The `ON_WITH_EXCLUSION` guidance incorrectly implied that adding a permissive policy to excluded namespaces was the general equivalent. Updated it to apply policies to non-excluded namespaces and clarified when an allow-all policy is useful.
- The transition step said old RBAC v1 and new AuthorizationPolicy resources work simultaneously. Updated it to say that for the same workload, AuthorizationPolicy takes precedence and the old RBAC v1 policy is ignored.
- The transition step used only current `security.istio.io/v1` examples without noting that Istio 1.4 and 1.5 used `security.istio.io/v1beta1`. Added the version-specific caveat.
- The advantages section said `when` supports any Envoy attribute. Updated it to Istio's documented authorization condition attributes.

## Review Notes
The post now uses `security.istio.io/v1` for current Istio examples, with a caveat that historical migrations on Istio 1.4/1.5 used `security.istio.io/v1beta1`. The examples assume mTLS is enabled where peer principals or namespaces are matched.
