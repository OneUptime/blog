# How to Set Up a Dapr Platform Team

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Platform Engineering, Team, Governance, Infrastructure

Description: Learn how to structure a Dapr platform team, define its responsibilities, and create the operational model that lets application teams adopt Dapr independently.

---

A Dapr platform team owns the runtime, shared components, and developer experience that enables application teams to use Dapr without becoming Dapr experts themselves. Without this team, Dapr adoption fragments into inconsistent per-team implementations.

## Platform Team Responsibilities

The platform team owns:

- Dapr runtime version upgrades across all clusters
- Shared component definitions (state stores, pub/sub, secret stores)
- Organization-wide resiliency policy templates
- Dapr Configuration resources and feature flag management
- Observability: dashboards, alerting, and trace configuration
- Developer documentation and onboarding guides
- Escalation point for Dapr-related production issues

Application teams own:

- App-specific component configuration (scopes, metadata overrides)
- Service code and app-specific resiliency tuning
- App ID naming within the team's namespace

## Staffing Model

A minimal platform team structure:

```markdown
Dapr Platform Team (4-6 people):
- Platform Lead (1): Architecture decisions, roadmap, external community
- Platform Engineers (2-3): Runtime ops, component management, CI tooling
- Developer Experience Engineer (1): Documentation, templates, onboarding
- Security Engineer (0.5 FTE): mTLS policies, secret store integration
```

For smaller organizations, these roles can be distributed across existing SRE or DevOps engineers as a 20-30% time commitment.

## Operational Model

Use a tiered support model:

```markdown
Tier 1 - Self-service:
  App teams consult docs and templates to solve common issues
  Internal wiki covers 80% of questions

Tier 2 - Platform team async:
  App teams open tickets for component configuration help
  SLA: 1 business day response

Tier 3 - Platform team sync:
  Production incidents involving Dapr runtime
  SLA: 30-minute response during business hours
```

## Runtime Upgrade Process

Manage runtime upgrades as a controlled process:

```bash
# Check current versions across clusters
KUBECONFIG=staging.kubeconfig dapr status -k
KUBECONFIG=production.kubeconfig dapr status -k

# Upgrade staging first
KUBECONFIG=staging.kubeconfig dapr upgrade -k \
  --runtime-version 1.15.0

# Validate after staging upgrade
kubectl get pods -n dapr-system
KUBECONFIG=staging.kubeconfig dapr status -k

# Run conformance suite against staging
# ... run your integration tests ...

# Schedule production upgrade with change management
KUBECONFIG=production.kubeconfig dapr upgrade -k \
  --runtime-version 1.15.0
```

## Component Change Management

Treat component changes like infrastructure changes:

```bash
# PR-based component changes
git checkout -b update-statestore-redis-version
# Edit component YAML
git commit -m "Update Redis state store to v7 for TLS 1.3 support"
# PR requires platform lead approval
```

## Internal SLA Metrics

Track platform team effectiveness:

```markdown
Monthly Platform Metrics:
- Dapr runtime availability: target 99.9%
- Mean time to deploy new component: target < 2 hours
- App team onboarding time: target < 4 hours
- Open platform tickets > 5 days: target 0
- Dapr version lag from latest stable: target < 2 minor versions
```

## Summary

A Dapr platform team owns runtime operations, shared components, and developer experience while application teams retain ownership of their service-specific configuration. Staff the team with platform engineers and a developer experience focus, operate a tiered support model, and track metrics like onboarding time and runtime upgrade lag to measure effectiveness.
