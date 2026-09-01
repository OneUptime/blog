# How to Pass Environment-Specific Overrides to One KubeVela Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Application Delivery, Continuous Delivery

Description: Keep one KubeVela component baseline while applying explicit topology and override policies for environment-specific images, configuration, and scale.

---

KubeVela separates a component baseline from placement and customization. A `topology` policy selects a cluster and namespace; an `override` policy patches selected components; and a `deploy` workflow step applies the relevant policy set. This is preferable to copying an entire Application per environment because unchanged fields remain visibly shared.

The important boundary is that the official multi-cluster design treats `override` as a deployment policy used with `topology`. In current KubeVela releases, a `deploy` step without a topology defaults to the hub cluster registered as `local` and the Application's namespace, so an override listed by itself can patch and deploy there unintentionally. Pair topology and override policies explicitly and verify the resource tree.

## Define a safe baseline

Start with the common artifact and operational defaults:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: orders
  namespace: delivery
  annotations:
    app.oam.dev/publishVersion: "orders-2.7.0"
spec:
  components:
    - name: api
      type: webservice
      properties:
        image: ghcr.io/example/orders-api@sha256:<verified-digest>
        ports:
          - name: http
            port: 8080
            expose: true
        env:
          - name: LOG_FORMAT
            value: json
      traits:
        - type: scaler
          properties:
            replicas: 2
```

The digest is a placeholder; replace it with a real verified image digest. Keep secrets out of both the baseline and overrides. Reference Kubernetes Secrets materialized by the environment's secret-management layer.

## Add topology per environment

The following policies target namespaces on the hub cluster registered as `local`:

```yaml
  policies:
    - name: target-dev
      type: topology
      properties:
        clusters: ["local"]
        namespace: orders-dev

    - name: target-staging
      type: topology
      properties:
        clusters: ["local"]
        namespace: orders-staging
```

For managed clusters, replace `local` with registered cluster names or a `clusterLabelSelector`. Destination namespaces must satisfy your KubeVela controller's cross-namespace policy and cluster RBAC. Create them through the owning platform bootstrap process.

## Patch only the differences

Use one override policy for each environment:

```yaml
    - name: config-dev
      type: override
      properties:
        components:
          - name: api
            properties:
              env:
                - name: LOG_FORMAT
                  value: console
                - name: FEATURE_CHECKOUT_V2
                  value: "true"
            traits:
              - type: scaler
                properties:
                  replicas: 1

    - name: config-staging
      type: override
      properties:
        components:
          - name: api
            properties:
              env:
                - name: LOG_FORMAT
                  value: json
                - name: FEATURE_CHECKOUT_V2
                  value: "true"
            traits:
              - type: scaler
                properties:
                  replicas: 3
```

In KubeVela v1.11, override policies recursively merge component property maps, replace non-empty property arrays such as `env`, and match trait entries by type before merging their properties. The installed CUE schema then validates and renders the result. Repeat every required environment entry in each override, render the final resources, and confirm that no baseline entry was dropped. When many environments repeat an array, consider exposing a map-shaped configuration in a custom component API or generating the Application from a typed source.

Do not use overrides to bypass platform policy-for example, changing service accounts, security context, or public exposure without review. Limit the public component schema and validate allowed values.

## Bind policies in the workflow

```yaml
  workflow:
    mode:
      steps: DAG
    steps:
      - name: deploy-dev
        type: deploy
        properties:
          policies: ["target-dev", "config-dev"]

      - name: deploy-staging
        type: deploy
        dependsOn: ["deploy-dev"]
        properties:
          policies: ["target-staging", "config-staging"]
```

KubeVela 1.5 and later support the explicit DAG mode shown above. In this mode, `dependsOn` makes staging wait for the development step to complete successfully; it does not perform business validation. Insert a manual `suspend` step or a dedicated verification workflow step into the dependency chain when promotion needs approval, tests, or SLO checks.

If both destinations may deploy concurrently, omit the dependency only after confirming they do not share mutable external state. Parallel rollout is a release decision, not a YAML optimization.

## Inspect the effective result

Before applying, verify the installed policy schemas:

```bash
vela show topology
vela show override
vela show deploy
vela dry-run --file orders.yaml
```

Then deploy and inspect each destination:

```bash
vela up --file orders.yaml --namespace delivery
vela status orders --namespace delivery --tree --detail
kubectl get application orders --namespace delivery -o yaml
```

For a managed cluster, use KubeVela's cluster-aware status output or a read-only kubeconfig for that cluster. Confirm image digest, environment variables, replica ownership, Service exposure, namespace, and health. Do not inspect only the hub Application; dispatched resources are the effective state.

## Prefer reusable external policies carefully

KubeVela supports external `Policy` and `Workflow` objects referenced by an Application. They reduce duplication across many Applications, and an internal same-named policy can override an external one. Official documentation notes that external policies and workflows must be in the Application's namespace.

This is useful for platform-owned topology, but it introduces another versioned dependency. Store policy and Application changes in Git, coordinate rollout, and include policy revisions in validation. A change to a shared `target-production` policy can affect many Applications when they next publish a revision. For Applications using `app.oam.dev/publishVersion`, dependency changes do not take effect until that annotation is advanced.

## Choose overrides versus separate Applications

One Application works well when environments share ownership, component topology, and release history and are intentionally coordinated by one workflow. Use separate Applications when:

- production needs independent RBAC or change control;
- environments promote at unrelated times;
- a rollback in one environment must not touch another;
- definitions or addons differ significantly; or
- one environment is long-lived while another is ephemeral.

Git overlays can still generate those Applications from one source. “One baseline” does not require “one runtime Application.” Choose the boundary that makes revision, reconciliation, and rollback ownership unambiguous.

## Avoid deprecated environment models

Older KubeVela documentation describes the `env-binding` policy. Current multi-cluster guidance uses `topology`, `override`, and `deploy`, while retaining some older APIs for compatibility. For new designs, use the model documented for your installed release. Do not migrate a working production Application solely by changing field names; render, stage, and validate the new dispatch behavior first.

## Official Documentation

- [KubeVela multi-cluster Application](https://kubevela.io/docs/case-studies/multi-cluster/)
- [KubeVela built-in policy types](https://kubevela.io/docs/end-user/policies/references/)
- [KubeVela workflow dependencies](https://kubevela.io/docs/end-user/workflow/dependency/)
- [KubeVela Application core concept](https://kubevela.io/docs/getting-started/core-concept/)
- [KubeVela legacy multi-environment policy](https://kubevela.io/docs/end-user/policies/envbinding/)

## Conclusion

Keep common component intent in one baseline and model each environment as an explicit topology-plus-override policy pair. Bind those pairs through named `deploy` steps, render the effective arrays and traits, and inspect dispatched resources in every destination. Use separate runtime Applications when change control or rollback boundaries differ, even if all manifests are generated from the same source.
