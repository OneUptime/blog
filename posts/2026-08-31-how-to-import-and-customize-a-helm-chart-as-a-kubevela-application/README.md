# How to Import and Customize a Helm Chart as a KubeVela Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, Application Delivery, Platform Engineering

Description: Choose the Helm capability installed in KubeVela, pin a chart, supply reviewed values and credentials, and inspect the rendered release safely.

---

KubeVela can package a Helm chart as an Application component, then add KubeVela placement, workflow, revision, and policy behavior around it. The exact component depends on release:

- KubeVela v1.10-era documentation commonly uses a FluxCD-addon-provided component named `helm`.
- Current v1.11-era reference documentation also describes `helmchart`, which renders and applies charts through the Helm Go SDK without requiring FluxCD.

These schemas are different. Discover the installed capability and choose one path:

```bash
vela version
vela show helmchart
vela show helm
vela addon status fluxcd
```

An unknown definition is not fixed by changing only `type`. Install the documented addon or upgrade through the supported procedure, and never deploy the same chart through both components.

## Inspect and pin the chart first

Resolve an exact chart version and review its defaults, templates, CRDs, hooks, and image references:

```bash
helm show chart <chart-reference> --version <chart-version>
helm show values <chart-reference> --version <chart-version> > /tmp/values.yaml
helm template review <chart-reference> \
  --version <chart-version> \
  --include-crds \
  --namespace app \
  --values ./values-reviewed.yaml > /tmp/rendered.yaml
```

Use a trusted HTTPS or OCI source and pin a chart version. A chart version can still reference mutable image tags, so override images to approved digests when the chart supports it. Scan the rendered resources and container images, and test upgrades and deletion in a nonproduction cluster.

## Current `helmchart` component

If `vela show helmchart` documents the current schema, an OCI example is:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: metrics
  namespace: delivery
  annotations:
    app.oam.dev/publishVersion: "metrics-chart-1.4.0"
spec:
  components:
    - name: metrics
      type: helmchart
      properties:
        chart:
          source: oci://ghcr.io/example/charts/metrics
          version: "1.4.0"
        release:
          name: metrics
          namespace: observability
        values:
          replicaCount: 2
          service:
            type: ClusterIP
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
        options:
          wait: true
          timeout: 10m
```

The repository and chart are illustrative. Compare every property with the installed reference. Current documentation describes chart sources from repositories, OCI registries, or direct `.tgz` URLs, optional `valuesFrom`, release name/namespace, wait/atomic controls, and health-status gates. It also creates a controller-managed ConfigMap named `{releaseName}-helm-release` in the release namespace as the stable release-metadata output. Do not edit that ConfigMap, and do not assume `helm list` or Flux resources are the source of truth for this component.

The current reference warns that Helm SDK readiness can report a single-replica Deployment ready immediately when `maxUnavailable` is `1`, because zero ready replicas satisfy `replicas - maxUnavailable`. In that case, `wait: true` and `atomic: true` do not provide the safety their names suggest. Set an appropriate rollout strategy or replicas, and define a `healthStatus` gate for the specific Deployment condition when readiness must block the workflow.

Do not assume Helm deletion hooks run. The current `helmchart` reference explicitly warns that KubeVela garbage collection deletes resources through the Kubernetes API, so `pre-delete` and `post-delete` Helm hooks are bypassed, while install/upgrade hooks work. If a chart relies on delete hooks for external cleanup, design that lifecycle separately before adoption.

## FluxCD-backed `helm` component

On releases using the documented FluxCD path:

```bash
vela addon enable fluxcd
vela addon status fluxcd
vela show helm
```

Then model the chart with that definition's parameters:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: metrics
  namespace: delivery
spec:
  components:
    - name: metrics
      type: helm
      properties:
        repoType: helm
        url: https://charts.example.com
        chart: metrics
        version: "1.4.0"
        releaseName: metrics
        targetNamespace: observability
        values:
          replicaCount: 2
          service:
            type: ClusterIP
```

Ensure `observability` already exists in the destination cluster; the addon-provided `helm` definition does not expose Flux's `spec.install.createNamespace` setting. Enabling the addon installs the Flux controllers and CRDs, while applying the component creates a Flux source object and a `HelmRelease`. Inspect those objects and controller logs when chart fetch or release health fails. KubeVela's component health depends on the definition and Flux status; a successful source download does not prove the release is healthy.

## Supply private-repository credentials safely

Never place usernames, passwords, bearer tokens, client keys, or registry auth directly in the Application. Create a Kubernetes Secret through an external secret manager or encrypted GitOps mechanism, then reference it using the installed component schema.

The current `helmchart` reference documents `chart.auth.secretRef` and supports specific Secret types and keys for HTTPS, OCI, TLS, and bearer-token cases. The Secret is read from the control-plane cluster. Its namespace must be the Application namespace or release namespace according to the current schema; other cross-namespace references are rejected. Example shape, assuming `observability` also exists on the hub:

```yaml
chart:
  source: oci://registry.example.com/charts/metrics
  version: "1.4.0"
  auth:
    secretRef:
      name: chart-registry
      namespace: observability
```

Use only the fields printed by `vela show helmchart`. The FluxCD-backed `helm` definition uses its own `secretRef` contract. Rotate credentials at the secret source and verify that the selected controller observes the update. Do not confuse this hub-side chart-fetch credential with Secrets consumed by Pods rendered from the chart.

Keep TLS verification enabled. Configure the correct CA through the documented Secret fields instead of using insecure skip options as a routine workaround.

## Separate nonsecret values from secret values

Inline `values` are appropriate for reviewed nonsecret settings. For larger configuration, current `helmchart` documentation supports `valuesFrom` references to a ConfigMap or Secret, with defined merge order and namespace restrictions. Those sources are also read from the control-plane cluster even when the chart is dispatched elsewhere. Flux's component has a separate `valuesFrom` shape.

Arrays are generally replaced, not concatenated, by Helm values merging. Validate the final render when overriding ingress hosts, tolerations, environment arrays, or persistence. A harmless-looking override can drop chart defaults.

Do not copy an entire upstream `values.yaml` into your Application. Keep the minimal deliberate delta so upgrades reveal new defaults and deprecated fields.

## Render, deploy, and inspect

Use the earlier `helm template` command as the non-mutating chart preview. On KubeVela v1.11, do not rely on `vela dry-run` as a safety boundary for `helmchart`: after admission validation, the CLI's local render path can invoke the native Helm provider's real install/upgrade path. For Flux-backed `helm`, `vela dry-run` previews the generated Flux custom resources rather than the chart's workloads.

```bash
# Flux-backed helm only: preview the generated Flux resources
vela dry-run --file metrics.yaml

# Deploy either component after reviewing the chart render
vela up --file metrics.yaml --namespace delivery
vela status metrics --namespace delivery --tree --detail
```

For `helmchart`, compare the deployed KubeVela resource tree with `helm template`; the two may differ because KubeVela adds context, placement, policies, or generated wrapper resources. After deployment, inspect the target namespace and controller-specific status:

```bash
kubectl get all --namespace observability
kubectl get events --namespace observability --sort-by=.lastTimestamp
```

For Flux-backed delivery, inspect the generated source object (`HelmRepository` in this example), `HelmRelease`, and their conditions using the API versions installed by the addon. For `helmchart`, use the KubeVela resource tree and Application conditions. Diagnose source authentication, rendering, admission, hooks, readiness, and health as separate layers.

## Add KubeVela placement and workflow carefully

Use `topology` and `override` policies with a `deploy` workflow step for multi-cluster delivery. Every destination must have any prerequisites the chart needs, such as CRDs, storage, workload runtime Secrets, ingress classes, and image-registry access. Flux-backed `helm` also requires the Flux controllers and CRDs in each destination. By contrast, current `helmchart` chart-auth and `valuesFrom` objects are hub-side inputs and are not destination Secrets. Pin the same chart and artifact versions across clusters unless a reviewed override intentionally differs.

Charts can create cluster-scoped resources. Deploying the same chart more than once into the same destination cluster can cause ownership conflicts when releases manage the same cluster-scoped resources. Inventory CRDs, ClusterRoles, webhook configurations, and release names before replication.

## Official Documentation

- [KubeVela Helm chart tutorial](https://kubevela.io/docs/tutorials/helm/)
- [KubeVela built-in component reference](https://kubevela.io/docs/end-user/components/references/)
- [KubeVela FluxCD addon](https://kubevela.io/docs/reference/addons/fluxcd/)
- [KubeVela addon command group](https://kubevela.io/docs/cli/vela_addon/)
- [Helm template command](https://helm.sh/docs/helm/helm_template/)
- [Helm chart values](https://helm.sh/docs/chart_template_guide/values_files/)

## Conclusion

First discover whether the cluster provides `helmchart` or the FluxCD-backed `helm` definition, then use that schema consistently. Pin and inspect the chart, keep values minimal, reference credentials through appropriately typed Secrets, render before apply, and verify controller-specific health. Account for cluster-scoped resources and delete-hook behavior before making the chart part of a production KubeVela lifecycle.
