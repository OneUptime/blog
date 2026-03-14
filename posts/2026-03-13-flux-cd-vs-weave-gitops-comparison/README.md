# Flux CD vs Weave GitOps: Feature Comparison

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Weave GitOps, GitOps, Kubernetes, Comparison, CNCF, Enterprise

Description: Compare open-source Flux CD and Weave GitOps Enterprise features, covering the value of enterprise add-ons over the upstream open-source project.

---

## Introduction

Weave GitOps (now Flux Enterprise, offered by Weaveworks before its acquisition) was a commercial product built on top of open-source Flux CD. It provided a web UI, policy management, and multi-tenancy features that the open-source Flux CD project does not include. Understanding the relationship between upstream Flux CD and its enterprise distributions helps teams decide whether the open-source project alone meets their needs.

This post clarifies what Weave GitOps added over upstream Flux CD and evaluates alternatives for teams that need those enterprise features today.

## Prerequisites

- Understanding of Flux CD core features
- A Kubernetes cluster for deployment
- Interest in evaluating GitOps enterprise features

## Step 1: Upstream Flux CD Capabilities

Open-source Flux CD provides:

```yaml
# Core Flux CD capabilities
- GitRepository, OCIRepository, HelmRepository, Bucket sources
- Kustomization for manifest deployment
- HelmRelease for Helm chart management
- Notification Controller for alerts
- Image Reflector + Image Automation Controllers
- SOPS native decryption
- Multi-tenancy via Kubernetes RBAC
```

What upstream Flux CD does NOT include:
- Web UI for visualizing GitOps state
- Policy-as-code enforcement (requires OPA/Kyverno separately)
- Team management with SSO out of the box
- Commercial support SLAs

## Step 2: What Weave GitOps Added

Weave GitOps Enterprise layered these features on top of Flux CD:

```
Enterprise Features:
- Weave GitOps UI (React-based dashboard for Flux resources)
- Policy Controller (OPA-based policy enforcement at admission)
- Team Workspaces (multi-tenant UI with RBAC)
- Secrets UI (SOPS/ESO integration in the UI)
- Pipeline Management (visual deployment pipelines)
- Cluster Management (multi-cluster provisioning)
- GitOpsSets (templating similar to ApplicationSets)
- Progressive Delivery UI (Flagger visualization)
```

## Step 3: Current State (Post-Weaveworks)

Following Weaveworks' wind-down, the open-source Flux CD project continues independently as a CNCF Graduated project. Several alternatives now fill the enterprise UI gap:

```yaml
# Community alternatives for Flux CD UI:
- Capacitor: Open-source Flux CD UI (https://github.com/gimlet-io/capacitor)
- Flamingo: ArgoCD UI for Flux (experimental)
- GitOps Dashboard: Community dashboards for Grafana
```

## Step 4: GitOpsSets vs ApplicationSets

Weave GitOps introduced GitOpsSets (similar to ArgoCD's ApplicationSets) for templating multiple Kustomizations:

```yaml
# Weave GitOps GitOpsSet (enterprise feature)
apiVersion: templates.weave.works/v1alpha1
kind: GitOpsSet
metadata:
  name: microservices
spec:
  generators:
    - list:
        elements:
          - service: frontend
            port: "3000"
          - service: backend
            port: "8080"
  templates:
    - content:
        apiVersion: kustomize.toolkit.fluxcd.io/v1
        kind: Kustomization
        metadata:
          name: "{{ .Element.service }}"
        spec:
          path: "./apps/{{ .Element.service }}"
          interval: 5m
          sourceRef:
            kind: GitRepository
            name: fleet-repo
```

In upstream Flux CD, similar templating is achieved with variable substitution:

```yaml
# Upstream Flux variable substitution (no GitOpsSet needed)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
spec:
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
    substitute:
      APP_NAME: "myapp"
      APP_NAMESPACE: "production"
```

## Step 5: Evaluating Today's Options

| Need | Open-Source Option | Enterprise Option |
|---|---|---|
| GitOps reconciliation | Flux CD | Flux CD |
| Web UI | Capacitor, custom Grafana | Commercial Flux distributions |
| Policy enforcement | OPA/Kyverno | OPA/Kyverno (self-managed) |
| SSO for GitOps UI | N/A (no UI) | Via commercial products |
| Commercial support | CNCF ecosystem vendors | Various GitOps vendors |
| Multi-cluster UI | Flux + Grafana dashboards | ArgoCD or commercial tools |

## Best Practices

- Start with upstream Flux CD for all core GitOps functionality; it is production-ready and actively maintained.
- Use Capacitor or Grafana dashboards for visual observability of Flux resources without enterprise licensing.
- For policy enforcement, deploy OPA Gatekeeper or Kyverno alongside Flux CD using Flux's own HelmRelease management.
- Evaluate whether the enterprise features (UI, policy, SSO) justify their cost versus assembling open-source alternatives.
- Monitor the CNCF GitOps ecosystem for new tooling that addresses the UI and multi-tenancy gaps in upstream Flux CD.

## Conclusion

Open-source Flux CD covers the core GitOps reconciliation use case exceptionally well. Weave GitOps Enterprise added a compelling UI and policy layer, but with Weaveworks' exit, teams should evaluate open-source alternatives for those features. The good news is that upstream Flux CD is thriving as a CNCF Graduated project, and the ecosystem is producing open-source UI and policy tooling that closes the enterprise gap over time.
