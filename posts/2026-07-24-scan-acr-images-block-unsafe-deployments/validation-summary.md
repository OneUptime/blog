# Validation Summary: Scanning ACR Images for Vulnerabilities and Blocking Unsafe Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Azure
- Azure Container Registry (ACR)
- Microsoft Defender for Cloud
- Defender for Containers
- Defender Cloud Security Posture Management (CSPM)
- Azure CLI
- Azure Resource Graph and Kusto Query Language (KQL)
- Kubernetes admission control
- Container image vulnerability assessment
- CI/CD security gates

## Sources Consulted
- [Scan registry images with Microsoft Defender for Cloud](https://learn.microsoft.com/en-us/azure/container-registry/scan-images-defender)
- [Vulnerability management for containers](https://learn.microsoft.com/en-us/azure/defender-for-cloud/agentless-vulnerability-assessment-azure)
- [Enable Defender for Containers](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-enable-plan)
- [Access patterns and private cluster support for Defender for Containers features](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-feature-access-patterns)
- [Gated deployment for Kubernetes container images](https://learn.microsoft.com/en-us/azure/defender-for-cloud/runtime-gated-overview)
- [Configure gated deployment rules for Kubernetes container images](https://learn.microsoft.com/en-us/azure/defender-for-cloud/enablement-guide-runtime-gated)
- [Defender for Containers support matrix](https://learn.microsoft.com/en-us/azure/defender-for-cloud/support-matrix-defender-for-containers)
- [Transition from grouped to individual recommendations](https://learn.microsoft.com/en-us/azure/defender-for-cloud/transition-grouped-individual-recommendations)
- [Defender for Cloud Assessments REST API](https://learn.microsoft.com/en-us/rest/api/defenderforcloud-composite/assessments/list?view=rest-defenderforcloud-composite-stable)
- [Azure CLI: `az security pricing`](https://learn.microsoft.com/en-us/cli/azure/security/pricing?view=azure-cli-latest)
- [Azure CLI: `az acr`](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure CLI: `az acr manifest`](https://learn.microsoft.com/en-us/cli/azure/acr/manifest?view=azure-cli-latest)
- [Allow trusted services to access a network-restricted ACR](https://learn.microsoft.com/en-us/azure/container-registry/allow-access-trusted-services)
- [Import container images to ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-import-images)
- [Kubernetes misconfiguration enforcement](https://learn.microsoft.com/en-us/azure/defender-for-cloud/kubernetes-misconfiguration-enforcement)
- [Defender for Cloud CLI overview](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-cli-overview)

## Issues Found
- The gated-deployment prerequisites were too broad and used an outdated alternative capability name. Updated them to require Defender for Containers in every environment containing the cluster or registry, Registry access with Security findings, and the Defender sensor with Security Gating. Added the documented AKS OIDC issuer and connectivity requirements.
- The recommendation-transition text did not mention that grouped container vulnerability recommendations are deprecated on July 31, 2026, and the post linked to the legacy grouped subassessment REST API. Updated the text to use individual `microsoft.security/assessments` records and replaced the REST link with the current Assessments API.
- The gated-deployment portal path named the tab `Vulnerabilities`. Corrected it to the current `Vulnerability assessment` label.
- Missing vulnerability-artifact behavior was described only as rule-dependent. Clarified the current `Block all deployments with missing artifacts` rule setting so readers can explicitly fail closed.
- Cross-registry promotion could have implied that assessment evidence from the source registry was automatically sufficient in the target registry. Added a requirement to wait for assessment evidence in the target registry before deployment.

## Review Notes
- All Azure CLI examples are syntactically valid and use current commands. The post correctly notes that the `az acr manifest` command group remains in preview and that the older `az acr repository show-manifests` command is no longer in the current command group.
- Registry assessment is asynchronous. Current Defender documentation says newly pushed or imported images are typically scanned within a few hours, with daily rescans for recently pushed, recently pulled, or currently running images.
- Enabling the `Containers` pricing tier alone does not enable every gated-deployment component. The post correctly directs readers to verify Registry access, Security findings, the Defender sensor, and Security Gating separately.
- Microsoft now also documents the Defender for Cloud CLI for synchronous image scanning in CI/CD. It is an optional earlier-feedback mechanism; the post's digest-based registry and admission boundaries remain valid.
