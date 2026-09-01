# How to Promote a KubeVela Application Across Dev, Staging, and Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Continuous Delivery, Multi-Cluster, Workflow, Application Delivery

Description: Promote one immutable KubeVela release through dev, staging, and production with topology policies, overrides, workflow gates, and verifiable revisions.

---

Promotion means moving the **same verified artifact** through increasingly controlled environments. Rebuilding an image for each stage is three releases, not promotion. In KubeVela, keep the image digest and common component intent in the Application baseline, describe each destination with `topology`, customize only necessary differences with `override`, and make the release order explicit in a workflow.

One runtime Application can coordinate all three destinations, which is useful when they share ownership and rollback policy. Separate Applications generated from the same source are often better when production has independent RBAC, approval, maintenance windows, or revision retention. Choose that boundary before designing rollback.

## Pin a release identity

Use an immutable image and a unique, DNS-1123-compatible publish version:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: checkout
  namespace: delivery
  annotations:
    app.oam.dev/publishVersion: "checkout-3.6.0-git.4f29c1a"
spec:
  components:
    - name: api
      type: webservice
      properties:
        image: ghcr.io/example/checkout@sha256:<verified-digest>
        ports:
          - name: http
            port: 8080
            expose: true
      traits:
        - type: scaler
          properties:
            replicas: 2
```

Replace the placeholder with the real digest produced and signed by CI. KubeVela includes the publish version in a ResourceTracker name, so keep it compatible with Kubernetes DNS subdomain naming rules. Store the manifest, digest, source commit, test evidence, and publish version together. KubeVela's Application revision captures desired state and runtime dependencies, but it does not replace artifact provenance.

## Describe three destinations

Clusters can be named directly or selected by labels. Direct names make the example deterministic:

```yaml
  policies:
    - name: dev-target
      type: topology
      properties:
        clusters: ["dev-eu"]
        namespace: checkout

    - name: staging-target
      type: topology
      properties:
        clusters: ["staging-eu"]
        namespace: checkout

    - name: production-target
      type: topology
      properties:
        clusters: ["prod-eu-1", "prod-eu-2"]
        namespace: checkout
```

Create the `delivery` namespace on the hub and the `checkout` namespace in every destination before applying; a topology policy selects a target namespace but does not create it.

Cluster-label selectors reduce repetition, but labels become deployment-critical configuration. Restrict who can change `environment=production`, audit label changes, and test that selectors match exactly the intended set before promotion.

Add narrow environment overrides:

```yaml
    - name: dev-config
      type: override
      properties:
        components:
          - name: api
            traits:
              - type: scaler
                properties:
                  replicas: 1

    - name: production-config
      type: override
      properties:
        components:
          - name: api
            traits:
              - type: scaler
                properties:
                  replicas: 6
```

Do not put production passwords in an override. The Application should reference a same-named Secret or external secret resource that each destination materializes locally. Environment-specific infrastructure endpoints should come from reviewed configuration, not shell substitution during deployment.

## Create explicit promotion gates

The built-in `deploy` step dispatches components with named policies, and `suspend` creates a manual gate:

```yaml
  workflow:
    steps:
      - name: deploy-dev
        type: deploy
        properties:
          policies: ["dev-target", "dev-config"]

      - name: approve-staging
        type: suspend

      - name: deploy-staging
        type: deploy
        properties:
          policies: ["staging-target"]

      - name: approve-production
        type: suspend

      - name: deploy-production
        type: deploy
        properties:
          policies: ["production-target", "production-config"]
```

Steps execute according to the workflow mode supported by the installed release. For DAG workflows, use `dependsOn` when dependencies are not already implied. Query the schemas with `vela show deploy` and `vela show suspend` before applying.

A `suspend` step is only a pause; it does not prove the previous environment passed tests. Your release process should collect smoke tests, synthetic checks, security policy results, error budgets, and human approval before calling:

```bash
vela workflow resume checkout --namespace delivery
```

Record who resumed and which evidence they approved. For unattended time gates, the documented `duration` property resumes after a period, but elapsed time is not validation.

## Validate before and during promotion

```bash
vela cluster list
vela dry-run --file checkout.yaml
vela up --file checkout.yaml --namespace delivery
vela status checkout --namespace delivery --tree --detail
vela revision list checkout --namespace delivery
```

The current `vela dry-run` considers topology and override policies plus `deploy` workflow steps, but ignores other workflow steps such as `suspend`. Use it to review rendered placement and resources, not to prove that approval gates, notifications, or arbitrary custom steps execute correctly.

Before each resume, verify the workflow step phase and inspect resources in the completed destination. KubeVela's multi-cluster-aware `vela status --pod`, `vela logs`, and `vela port-forward` can reach managed-cluster workloads through the control plane. Also check external observability because Kubernetes readiness cannot detect every business failure.

The effective production release must retain the same digest used in dev and staging. If an environment override changes the image, name it as a distinct release and restart validation.

## Decide failure behavior ahead of time

If dev fails, do not resume. Fix the manifest and publish a new version so the audit trail reflects a changed release. If staging fails after dev succeeded, terminate the workflow, or suspend it and roll back according to the documented procedure; do not edit the live staging Deployment because KubeVela will reconcile it.

For a publish-version Application such as this one, KubeVela's `vela workflow rollback` restores the latest succeeded Application revision, not an arbitrary hand-picked environment snapshot. With one Application spanning all environments, that rollback boundary may affect dispatched resources broadly. To republish a specific retained revision after review, name the Application and namespace explicitly: `vela up checkout --namespace delivery --revision <revision> --publish-version <new-version>`.

For production, define:

- whether rollback means the last fully successful global revision;
- how stateful schema changes remain backward compatible;
- whether traffic is drained or canaried separately;
- who can suspend, resume, terminate, and roll back; and
- what happens when one of multiple production clusters fails.

A database migration that cannot run against both old and new application versions can make an otherwise correct controller rollback unsafe. Use expand/contract migrations and test reversal procedures.

## Use separate Applications for stronger isolation

An alternative repository layout generates `checkout-dev`, `checkout-staging`, and `checkout-production` Applications from one release descriptor. Git promotion updates the digest reference in the next environment after evidence passes. This provides separate reconciliation, revision, RBAC, and rollback boundaries while preserving a single artifact.

Do not let Argo CD and KubeVela both own the generated Deployments. A GitOps controller should reconcile the KubeVela `Application` on the hub; KubeVela should own its rendered workloads and multi-cluster dispatch.

## Official Documentation

- [KubeVela multi-cluster Application](https://kubevela.io/docs/case-studies/multi-cluster/)
- [KubeVela suspend and resume](https://kubevela.io/docs/end-user/workflow/suspend/)
- [KubeVela workflow dependencies](https://kubevela.io/docs/end-user/workflow/dependency/)
- [KubeVela Application version control](https://kubevela.io/docs/end-user/version-control/)
- [KubeVela `vela revision` commands](https://kubevela.io/docs/cli/vela_revision/)
- [Kubernetes image digests](https://kubernetes.io/docs/concepts/containers/images/#image-names)

## Conclusion

Promote one pinned image digest and one auditable release identity. Model destinations with topology, keep overrides narrow, pause at explicit workflow gates, and require real evidence before resume. Choose one or separate KubeVela Applications according to RBAC and rollback boundaries, and rehearse failure handling before production rather than discovering what “latest succeeded revision” means during an incident.
