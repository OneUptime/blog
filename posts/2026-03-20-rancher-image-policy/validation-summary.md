# Validation Summary: How to Set Up Image Policy in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kyverno
- OPA Gatekeeper
- Harbor
- Sigstore Cosign
- Helm
- kubectl

## Sources Consulted
- Kyverno installation docs: https://kyverno.io/docs/installation/
- Kyverno validate rule docs: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno variables docs: https://kyverno.io/docs/policy-types/cluster-policy/variables/
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore verifyImages docs: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno sample policy for restricting image registries: https://kyverno.io/policies/best-practices/restrict-image-registries/restrict-image-registries/
- Gatekeeper ConstraintTemplate docs: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Rancher Helm Charts and Apps docs: https://documentation.suse.com/cloudnative/rancher-manager/v2.13/en/cluster-admin/helm-charts-in-rancher/helm-charts-in-rancher.html
- Rancher OPA Gatekeeper integration docs: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.9/en/integrations/opa-gatekeeper.html
- Harbor vulnerability scanning docs: https://goharbor.io/docs/main/administration/vulnerability-scanning/
- Harbor project configuration docs: https://goharbor.io/docs/main/working-with-projects/project-configuration/

## Issues Found
- The introduction described the workflow as using Rancher "built-in tools", but the post actually relies on external policy engines and registry features. I corrected the wording to describe Kyverno and Gatekeeper running in Rancher-managed clusters.
- The Kyverno policies used the deprecated top-level `spec.validationFailureAction` field. I moved enforcement to `validate.failureAction` or `verifyImages[*].failureAction`, which matches current Kyverno documentation.
- The registry allow-list example omitted `ephemeralContainers`. I added it so the policy covers all container types shown in current Kyverno examples.
- The `:latest` policy used an invalid deny expression against `request.object.spec.containers[].image`. I replaced it with a tag-based check using Kyverno's documented `images` variables so omitted tags and `:latest` are both denied while digest-pinned images remain valid.
- The digest-pinning policy used `NotContains`, which is not a supported Kyverno deny operator. I replaced it with `foreach` plus a valid pattern match requiring `*@sha256:*` across standard, init, and ephemeral containers.
- The Harbor section used an invalid Kyverno external API call shape (`apiCall.url`, `requestType: RawHTTP`) and a brittle Harbor query path. I replaced it with Harbor's supported project-level deployment security workflow and the official vulnerability-report API endpoint.
- The Cosign example enforced admission at the wrong level. I moved enforcement into the `verifyImages` rule using `failureAction: Enforce`.
- The Gatekeeper example used the older `templates.gatekeeper.sh/v1beta1` API and omitted the structural `type: object` schema requirement for `ConstraintTemplate` v1. I updated the template and simplified the Rego logic to a valid count-based check.
- The audit command piped pod output into `grep -v` against the start of the line, which never correctly matched the image column. I replaced it with a `go-template` plus `awk` pipeline that filters on the actual image field.
- The Rancher UI instructions were incomplete for current docs and did not mention deprecation status. I corrected the UI path to `Apps > Charts` and noted that Rancher documents OPA Gatekeeper as deprecated in favor of Kubewarden on newer releases.

## Review Notes
- Kyverno's current documentation groups `ClusterPolicy` under deprecated policy types even though it is still supported. The post is now technically correct, but a future refresh could migrate the Kyverno examples to `ValidatingPolicy` and `ImageValidatingPolicy`.
