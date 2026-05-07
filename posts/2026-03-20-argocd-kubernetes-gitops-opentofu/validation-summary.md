# Validation Summary: How to Use ArgoCD with OpenTofu for Kubernetes GitOps

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- Helm
- Terraform/OpenTofu Helm provider
- Terraform/OpenTofu Kubernetes provider

## Sources Consulted
- Argo Helm chart README: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Argo Helm chart repository and release information: https://github.com/argoproj/argo-helm
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/
- Argo CD ApplicationSet introduction: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/applicationset-specification/
- HashiCorp Terraform tutorial for `kubernetes_manifest` and CRDs: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider

## Issues Found
- The Helm chart snippet used generic Ingress-style fields (`hosts` and a list-valued `tls`) and the deprecated `kubernetes.io/ingress.class` annotation, but the current `argo-cd` chart documents `server.ingress.hostname`, `server.ingress.tls` as a boolean, and `server.ingress.ingressClassName`. I updated the snippet to the current chart values and added the documented NGINX backend protocol annotation for an HTTPS Argo CD server.
- The snippet pinned `argo-cd` chart version `6.7.3`, while the current official chart release on 2026-05-07 is `9.5.12` and the chart repo recommends staying on the latest supported version. I updated the pinned chart version accordingly.
- The chart values included `applicationSet = { enabled = true }`, but current chart documentation does not expose `applicationSet.enabled`, and the chart README notes that ApplicationSet is bundled with Argo CD. I removed the unsupported setting.
- The post implied Argo CD could be installed and then immediately managed via `kubernetes_manifest` in the same run. Official Terraform/Kubernetes provider documentation states that custom resource definitions must already exist before `kubernetes_manifest` can plan custom resources. I added a note clarifying that the Argo CD chart/CRDs need to be applied first, then the Argo CD custom resources in a second OpenTofu run.
- The `ApplicationSet` generated destination namespace `{{environment}}-${var.app_name}`, which does not match the AppProject destination allowlist `${var.team}-*`. I changed the generated namespace to `${var.team}-{{environment}}` so the generated Applications are permitted by the project policy.
- The `ApplicationSet` template omitted `CreateNamespace=true`, even though the example relies on namespace auto-creation elsewhere. I added `syncOptions = ["CreateNamespace=true"]` to keep the multi-environment example consistent with Argo CD's documented namespace auto-creation behavior.
- The `Application` and `ApplicationSet` examples did not declare explicit dependencies on the AppProject, which makes the intended apply order less reliable once the CRDs exist. I added `depends_on` entries so the examples reflect the intended sequencing.

## Review Notes
- The current `argo-cd` chart line tracks modern Argo CD releases and the chart documentation lists Kubernetes `>=1.25.0-0` as a prerequisite. Readers on older clusters would need an older supported chart line.
- The chart README warns against placing sensitive repository credentials directly in version-controlled Helm values. This post uses `var.github_token`, which is better than hard-coding a token, but a secret manager or Argo CD declarative secret setup would still be safer for production use.
