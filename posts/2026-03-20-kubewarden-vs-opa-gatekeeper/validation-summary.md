# Validation Summary: Kubewarden vs OPA Gatekeeper: Policy Engine Comparison

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Kubernetes admission control
- Kubewarden
- OPA Gatekeeper
- Open Policy Agent (OPA)
- Rego
- Common Expression Language (CEL)
- Kubernetes ValidatingAdmissionPolicy
- WebAssembly (Wasm)
- `kwctl`
- `gator`

## Sources Consulted
- Kubewarden docs: What is Kubewarden? https://docs.kubewarden.io/1.24
- Kubewarden docs: Distributing policies https://docs.kubewarden.io/explanations/distributing-policies
- Kubewarden docs: `kwctl` CLI reference https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden docs: Audit Scanner policy reports https://docs.kubewarden.io/explanations/audit-scanner/policy-reports
- Kubewarden docs: Go policy validation tutorial https://docs.kubewarden.io/1.26/tutorials/writing-policies/go/validation
- Kubewarden docs: Rancher UI extension quickstart https://docs.kubewarden.io/howtos/ui-extension/install
- Kubewarden upstream template: `go-policy-template/main.go` https://raw.githubusercontent.com/kubewarden/go-policy-template/main/main.go
- Kubewarden upstream template: `go-policy-template/validate.go` https://raw.githubusercontent.com/kubewarden/go-policy-template/main/validate.go
- Kubewarden upstream policy metadata: `safe-labels-policy/metadata.yml` https://raw.githubusercontent.com/kubewarden/safe-labels-policy/main/metadata.yml
- Kubewarden upstream policy README: `safe-labels-policy/README.md` https://raw.githubusercontent.com/kubewarden/safe-labels-policy/main/README.md
- Gatekeeper docs: Constraint Templates https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper docs: Integration with Kubernetes Validating Admission Policy https://open-policy-agent.github.io/gatekeeper/website/docs/validating-admission-policy/
- Gatekeeper docs: Mutation https://open-policy-agent.github.io/gatekeeper/website/docs/v3.19.x/mutation/
- Gatekeeper docs: Audit https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper docs: `gator` CLI https://open-policy-agent.github.io/gatekeeper/website/docs/next/gator/
- Gatekeeper website https://open-policy-agent.github.io/gatekeeper/website/
- OPA CLI reference https://www.openpolicyagent.org/docs/cli
- Kubewarden Go SDK package docs https://pkg.go.dev/github.com/kubewarden/policy-sdk-go

## Issues Found
- The post described Gatekeeper as Rego-only and CNCF graduated. I corrected this to reflect current Gatekeeper behavior: Gatekeeper is built on OPA, supports CEL through ValidatingAdmissionPolicy/K8sNativeValidation integration, and is part of the OPA ecosystem rather than a separate CNCF graduated project.
- The feature table was outdated on mutation, testing, distribution, Rancher integration, and performance wording. I updated Gatekeeper mutation to non-experimental, replaced Gatekeeper testing guidance with the documented `gator` workflows, clarified distribution/integration details, and removed unverified blanket performance claims.
- The Kubewarden language-support description overstated what is officially supported. I replaced the unsupported “Python, AssemblyScript, or any Wasm language” wording with the documented requirement for a compatible waPC guest SDK and listed the SDK/template ecosystems Kubewarden currently provides.
- The Kubewarden manifest example referenced an unverified `require-labels` module/version. I replaced it with the documented `safe-labels` policy and its `mandatory_labels` settings.
- The Kubewarden Go example used non-current or nonexistent SDK APIs (`UnmarshalAdmissionRequest`, `WasiEntryPoint`) and had invalid Go imports/return values. I rewrote it to match current `policy-sdk-go` usage using `ValidationRequest` plus `json.Unmarshal`.
- The second `kwctl run` example was not valid shell because the trailing backslash escaped the newline before a comment. I fixed the command so it can be copied and executed.
- The Kubewarden audit section was outdated. I updated it to the current OpenReports `Report` / `ClusterReport` model used by Kubewarden 1.33+ instead of implying audit results are read from `ClusterAdmissionPolicy.status`.

## Review Notes
- The Gatekeeper YAML example still uses legacy Rego v0 syntax under `spec.targets[].rego`; this is still valid, although newer Gatekeeper releases also support opt-in Rego v1 syntax and CEL-based `K8sNativeValidation`.
- The `safe-labels-policy` repository is archived because Kubewarden moved policy development into a monorepo starting with Kubewarden 1.32. The validated module name and settings used in the post remain correct for the published policy artifact referenced here.
