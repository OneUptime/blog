# Validation Summary: How to Scan Flux Manifests for Security Misconfigurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes manifests
- Kustomize
- Helm
- Trivy
- Kubesec
- Checkov
- Rego policies
- pre-commit
- yamllint

## Sources Consulted
- Trivy config CLI reference: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_config/
- Trivy custom misconfiguration checks: https://trivy.dev/docs/latest/scanner/misconfiguration/custom/
- Trivy installation documentation: https://trivy.dev/latest/getting-started/installation/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux build kustomization CLI reference: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Helm template command reference: https://helm.sh/docs/helm/helm_template/
- Checkov Kubernetes scanning documentation: https://www.checkov.io/7.Scan%20Examples/Kubernetes.html
- Checkov Kubernetes policy index: https://www.checkov.io/5.Policy%20Index/kubernetes.html
- Checkov pre-commit hook documentation: https://www.checkov.io/4.Integrations/pre-commit.html
- Kubesec documentation: https://kubesec.io/
- Kubesec GitHub releases: https://github.com/controlplaneio/kubesec/releases/latest

## Issues Found
- The prerequisites listed `kubectl` for rendering manifests, but the examples use `kustomize build` and `helm template`. Changed the prerequisite to `kustomize and helm`.
- The Trivy custom policy example used the older `--policy` option. Updated it to `--config-check ./custom-policies/ --check-namespaces flux`, matching current Trivy custom-check CLI documentation and the `flux.*` Rego package namespace.
- The Checkov examples used `CKV_K8S_1` for privileged workload containers, but the current Checkov Kubernetes policy index maps workload privileged containers to `CKV_K8S_16`; `CKV_K8S_1` applies to PodSecurityPolicy host PID sharing. Updated the example check ID.
- The Checkov examples used `CKV_K8S_6` for root workload containers, but the current Checkov Kubernetes policy index maps workload root containers to `CKV_K8S_23`; `CKV_K8S_6` applies to PodSecurityPolicy root-container admission. Updated the example check ID.
- The pre-commit snippet used `antonbabenko/pre-commit-terraform` with hook id `checkov`. Replaced it with the official `bridgecrewio/checkov.git` pre-commit hook source and added a YAML file matcher so Kubernetes manifests trigger the hook.

## Review Notes
The remaining commands and examples are technically plausible for the stated workflow. The custom Rego policy is intentionally simple and returns string messages, which Trivy supports, though a production policy could add Trivy metadata for richer output.
