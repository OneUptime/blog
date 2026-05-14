# Validation Summary: How to Validate Flux CD Manifests Before Commit with Policy Engines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kyverno CLI
- OPA Gatekeeper and Rego
- Conftest
- Kubewarden and kwctl
- kubeconform
- pre-commit
- GitHub Actions
- Kustomize

## Sources Consulted
- Kyverno CLI documentation: https://kyverno.io/docs/subprojects/kyverno-cli/
- Kyverno apply command reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kyverno policy reports documentation: https://kyverno.io/docs/guides/reports/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux CLI command references: https://fluxcd.io/flux/cmd/flux_check/ and https://fluxcd.io/flux/cmd/flux_build_kustomization/
- kubeconform README and usage reference: https://github.com/yannh/kubeconform
- Conftest documentation and install guide: https://www.conftest.dev/ and https://www.conftest.dev/install/
- Kubewarden kwctl CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden kwctl install guide: https://docs.kubewarden.io/howtos/install-kwctl
- Kubewarden policy examples: https://docs.kubewarden.io/howtos/policies and https://docs.kubewarden.io/explanations/policy-groups

## Issues Found
- The Kyverno manual install URL used the wrong Linux architecture suffix for the documented v1.12.0 tarball. Updated it from `linux_amd64` to `linux_x86_64` and matched the official extraction/copy commands.
- The kubeconform pre-commit example referenced the kubeconform source repository as if it provided a pre-commit hook. Changed it to a local system hook that invokes the installed `kubeconform` binary.
- The Kyverno pre-commit hook passed all filenames to a single `--resource` flag. Changed it to loop through filenames and invoke Kyverno with one resource path at a time.
- The GitHub Actions Flux step used `flux check --pre` inside a file loop and described it as manifest validation. Replaced it with a simple `flux --version` check, because `flux check --pre` checks environment and installation prerequisites rather than YAML resources.
- The Kustomize build step suppressed build failures with `|| true`. Removed the suppression so invalid overlays fail the CI job.
- The Kyverno CI example used `--output json`, which is for mutated/generated resource output, not policy report formatting. Changed it to `--policy-report --output-format json` and updated the `jq` filter to check the policy report `result` field.
- The GitHub PR comment script embedded Markdown backticks inside a JavaScript template literal, which made the script syntactically invalid. Rewrote the body construction with an array joined by newlines.
- The Rego label policy did not handle Deployments with no `metadata.labels` map. Added `object.get` so missing labels are correctly treated as an empty set.
- The Conftest examples used older Rego rule syntax and pinned an old CLI release. Updated the rules to current `deny contains msg if` syntax and switched the install snippets to the official latest-release pattern.
- The Kubewarden install commands used an outdated binary name. Updated them to the documented `kwctl-linux-x86_64.zip` installation flow.
- The Kubewarden examples implied `kwctl run --request-path` could accept raw Kubernetes manifests. Clarified that it evaluates AdmissionReview request JSON and updated the examples to use an `admission-reviews/*.json` input directory.
- The Kubewarden policy tags included outdated or unsupported-looking versions. Updated `pod-privileged` and `trusted-repos` examples to versions present in current Kubewarden documentation.
- The comprehensive Conftest `find -exec ... +` command placed `{}` before additional arguments, which is not valid for the `+` form. Replaced it with a shell loop invoked by `find -exec sh -c`.

## Review Notes
The post is now technically valid for its stated workflow. Future improvements could include adding a concrete example of generating AdmissionReview JSON from rendered Kubernetes manifests for Kubewarden, but that would be an expansion rather than a correctness fix.
