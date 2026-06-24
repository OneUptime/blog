# How to Understand Dapr Component Certification Tiers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Certification, Stability, Production

Description: Learn the difference between Dapr component certification tiers - Alpha, Beta, and Stable - and what each tier means for production use and support guarantees.

---

Not all Dapr components are equally mature. Dapr uses a certification lifecycle to communicate the production-readiness, test coverage, and support level of each component implementation.

## The Three Certification Levels

### Alpha

Alpha components are newly contributed or experimental. They:

- Implement the required interface and work as described, but might be buggy
- May not pass all conformance tests or may lack them entirely
- Have potential for incompatible changes in subsequent releases
- Are recommended for only non-business-critical uses

### Beta

Beta components have passed basic quality gates and are approaching stable. They:

- Must pass all component conformance tests
- Are reasonably stable but still have potential for incompatible changes in subsequent releases
- Are recommended for only non-business-critical uses

### Stable

Stable components are production-ready. They:

- Pass the full Dapr component certification tests, which validate functionality and resiliency
- Have a maintainer who addresses issues
- Must have been Alpha or Beta for at least one minor version release
- Are safe for production use in business-critical systems

## Finding Component Certification Status

The certification status is listed in the status column of the component reference tables in the Dapr docs (for example, the supported state stores page at the Dapr docs site).

You can also browse the component registry:

```bash
# Browse components in the Dapr components-contrib repository
git clone https://github.com/dapr/components-contrib.git
ls components-contrib/state/
```

Each component folder contains its implementation and tests.

## Conformance Tests

Stable components pass the Dapr conformance test suite, which validates:

```bash
# Run conformance tests locally (from components-contrib)
cd components-contrib
go test -v -tags=conftests -count=1 ./tests/conformance -run="TestStateConformance/redis"
```

Conformance tests verify behaviors like:
- State store CRUD operations and ETags
- Pub/sub publish/subscribe message delivery
- Binding input/output behavior
- Secret store read operations

## Choosing Components for Production

When evaluating a component for production use:

```yaml
# Check these before committing to a component:
# 1. Certification level (Stable preferred)
# 2. Last commit date on components-contrib GitHub
# 3. Open issues and pull request activity
# 4. Whether the backing service is self-hosted or cloud-managed
```

For example, Redis state store (Stable) vs. an Alpha state store:

```yaml
# Stable - safe for production
spec:
  type: state.redis
  version: v1

# Alpha - evaluate carefully before production use
spec:
  type: state.rethinkdb
  version: v1
```

## Summary

Dapr components use three certification levels: Alpha (experimental), Beta (approaching stable), and Stable (production-ready and certification-tested). Always check the certification level before using a component in production, and prefer Stable components for business-critical workloads to avoid unexpected incompatible changes.
