# Validation Summary: ArgoCD Community vs ArgoCD Enterprise (Akuity): When to Upgrade

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Argo CD
- Akuity Platform
- GitOps
- Kubernetes
- Helm
- Prometheus Operator ServiceMonitor
- SSO/OIDC/SAML

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/auto_sync/
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD metrics and ServiceMonitor examples: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD user management and SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo Helm chart values and templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Akuity Platform overview: https://docs.akuity.io/
- Akuity Platform architecture: https://docs.akuity.io/overview/architecture
- Akuity Agent documentation: https://docs.akuity.io/argocd/managing-instances/clusters/
- Akuity Argo CD instance upgrade documentation: https://docs.akuity.io/argocd/managing-instances/settings/general/
- Akuity Platform SSO documentation: https://docs.akuity.io/organizations/sso/
- Akuity pricing page: https://akuity.io/pricing/

## Issues Found
- The opening described Akuity as "the enterprise version of ArgoCD" and said it was built by the same team that maintains the open source project. I changed this to Akuity's documented positioning as a fully managed Kubernetes application delivery platform powered by Argo and built by Argo CD's original creators.
- The relationship section said Akuity runs the same ArgoCD with configurations working identically. I changed this to reflect Akuity's documented upstream Argo CD deployment model, optional Akuity-maintained Argo CD version, and the caveat that some platform and in-cluster configuration differs.
- The managed control plane section incorrectly implied Akuity runs all Argo CD control plane components outside the cluster and that only a lightweight agent runs in-cluster. I updated it to match Akuity's hybrid architecture, where controller/repo-server components can run in managed clusters while Akuity hosts and manages the frontend/control plane.
- The Akuity agent installation command used an undocumented `akuity agent install` form. I replaced it with the documented `akuity argocd cluster get-agent-manifests --instance-name=... <cluster> | kubectl apply -f -` flow.
- The SSO comparison implied community Argo CD only uses Dex. I corrected it to say Argo CD supports bundled Dex or an existing OIDC provider, while Akuity adds platform-level enterprise SSO.
- The Helm upgrade example pinned old chart version `6.5.0`. I updated it to the current official argo-helm chart tag `9.5.14` as of this review.
- The Helm scaling values manually set `ARGOCD_CONTROLLER_REPLICAS`; the official chart already renders that environment variable from `controller.replicas`. I removed the redundant override.
- The ServiceMonitor example used a broad `app.kubernetes.io/part-of: argocd` selector. I changed it to the upstream application-controller metrics selector `app.kubernetes.io/name: argocd-metrics`.
- The Akuity pricing section listed a "Starter: Free" tier and rounded Pro to about $500/month. I updated it to the current pricing page: free trial available, Pro starts at $495/month, Enterprise is contact-sales pricing.

## Review Notes
The post remains a high-level comparison, so cost estimates and upgrade/operations guidance should be revisited periodically because Akuity packaging, pricing, and Argo CD chart versions change over time. The local environment did not have `helm`, `kubectl`, `argocd`, or `akuity` installed, so CLI verification was performed against official documentation and upstream repository content rather than local `--help` output.
