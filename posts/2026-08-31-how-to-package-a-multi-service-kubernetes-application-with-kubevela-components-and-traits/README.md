# How to Package a Multi-Service Kubernetes Application with KubeVela Components and Traits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Application Delivery, Platform Engineering, Workflow

Description: Model related services as KubeVela components, attach reusable operational traits, express health dependencies, and inspect the rendered Kubernetes resources.

---

A KubeVela `Application` is a delivery plan composed of components, traits, policies, and optionally a workflow. A component describes a deployable artifact such as a container service or Helm chart. A trait adds an operational behavior-scaling, routing, storage, a sidecar, or another platform capability-to one component. This keeps the application author focused on parameters while the platform team owns the Kubernetes implementation.

Do not turn an Application into an unbounded inventory of an entire estate. KubeVela's core-concept guidance recommends treating an application as a microservice unit with one frequently developed core service and closely related dependencies, keeping component counts modest. Split services with independent ownership, release cadence, security boundary, or lifecycle into separate Applications and coordinate them through workflows or GitOps promotion.

## Inspect the installed platform API

Built-in definitions vary by KubeVela and addon version. Query the cluster instead of copying fields blindly:

```bash
vela def list --type component
vela def list --type trait
vela show webservice
vela show worker
vela show scaler
vela show gateway
```

These commands expose the platform API available to application authors. If `worker`, `gateway`, or another type is absent, install the documented addon or ask the platform owner; changing the YAML spelling will not manufacture a definition.

## Model services as components

The following example packages an API, a background worker, and a frontend. The frontend waits for the API to become healthy, while the worker can deploy independently.

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: storefront
  namespace: shop
  annotations:
    app.oam.dev/publishVersion: "2026-08-31.1"
spec:
  components:
    - name: api
      type: webservice
      properties:
        image: ghcr.io/example/store-api:1.8.2
        ports:
          - name: http
            port: 8080
            expose: true
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      traits:
        - type: scaler
          properties:
            replicas: 2

    - name: worker
      type: worker
      properties:
        image: ghcr.io/example/store-worker:1.8.2
        cmd: ["/app/worker"]
      traits:
        - type: scaler
          properties:
            replicas: 2

    - name: frontend
      type: webservice
      dependsOn:
        - api
      properties:
        image: ghcr.io/example/store-web:1.8.2
        ports:
          - name: http
            port: 8080
            expose: true
        env:
          - name: API_URL
            value: http://api:8080
      traits:
        - type: scaler
          properties:
            replicas: 2
        - type: gateway
          properties:
            class: nginx
            classInSpec: true
            domain: shop.example.com
            pathType: Prefix
            http:
              "/": 8080
```

Image references are illustrative. The current built-in `webservice` definition names the generated Service after the component, so this example's in-cluster host is `api`. Confirm that result from a render or resource tree because a customized definition can use another convention. In a mature platform, expose a stable service-name parameter or service-discovery convention rather than relying on an undocumented implementation detail.

`dependsOn` gates the dependent component on the dependency's reported health. That health is only as accurate as the component definition. A readiness probe improves the Kubernetes signal, but a custom definition may need an explicit health policy. Dependency ordering is not a substitute for application-level retries: networks fail and dependencies restart after deployment.

## Keep workload and operations separate

The component properties contain artifact-specific intent: image, command, ports, probes, and environment references. Traits contain optional operations:

- `scaler` changes desired replicas;
- `gateway` creates HTTP ingress resources around a service;
- storage or sidecar traits add operational resources or patches; and
- rollout or autoscaling traits may depend on addons and external controllers.

This separation makes the same `webservice` component usable without public ingress in development and with a gateway in production. It also lets platform engineers update the trait implementation centrally. Because a trait can patch or create resources, treat definition changes like API changes: version, review, test, and roll them out deliberately.

Do not attach two traits that both own `spec.replicas` unless the platform definition explicitly coordinates them. A fixed `scaler`, HPA, and KEDA can otherwise fight each other. KubeVela documents an `apply-once` policy for fields that an autoscaler must control.

## Render before applying

Render against the installed definitions in a nonproduction environment:

```bash
vela dry-run --file storefront.yaml
```

If your CLI release exposes different dry-run flags, use `vela help dry-run`. Review:

- resource names and namespaces;
- selectors shared by Deployments and Services;
- container ports versus Service ports;
- Ingress API and class fields;
- security contexts, service accounts, requests, and limits;
- generated health checks; and
- whether trait output collides with another component.

Apply only after the namespace, ingress controller, registry credentials, and any required addons exist:

```bash
kubectl create namespace shop
vela up --file storefront.yaml --namespace shop
```

Namespace creation is a one-time platform concern; in GitOps, declare it through the owning bootstrap layer instead of an imperative command.

## Observe the Application as one delivery unit

```bash
vela status storefront --namespace shop --tree --detail
vela status storefront --namespace shop --pod
vela status storefront --namespace shop --endpoint
kubectl get application storefront --namespace shop -o yaml
```

The resource tree connects each generated object to its component and trait. If a component remains unhealthy, inspect its Deployment, Pods, events, and definition health logic before assuming `dependsOn` is broken. If the gateway is healthy but unreachable, verify the ingress controller, `IngressClass`, DNS, TLS Secret, and external load balancer separately.

Use immutable image digests or rigorously controlled tags in production. Updating one component changes the Application revision and can re-run its workflow, so record a unique publish version and preserve the Git commit that produced it.

## Decide when to split the package

Keep components together when they are released and rolled back together, share a clear owner, and need a single delivery workflow. Split them when:

- the database or middleware must outlive the application;
- teams require separate RBAC or namespaces;
- one service releases far more frequently;
- a failure should not block unrelated components; or
- revision and rollback boundaries differ.

Cross-Application prerequisites can use the built-in `depends-on-app` workflow step, but durable APIs should still tolerate dependency unavailability. Delivery orchestration solves ordering, not distributed-system reliability.

## Official Documentation

- [KubeVela Application core concept](https://kubevela.io/docs/getting-started/core-concept/)
- [KubeVela built-in component types](https://kubevela.io/docs/end-user/components/references/)
- [KubeVela built-in trait types](https://kubevela.io/docs/end-user/traits/references/)
- [KubeVela component orchestration and dependencies](https://kubevela.io/docs/end-user/workflow/component-dependency-parameter/)
- [KubeVela `vela status` command](https://kubevela.io/docs/cli/vela_status/)
- [Kubernetes readiness probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

## Conclusion

Package a multi-service KubeVela Application around one coherent release boundary: represent artifacts as components, attach operational behavior as traits, use health-aware dependencies sparingly, and keep platform definitions discoverable through `vela show`. Render and inspect the resource tree before promotion, and split components into separate Applications whenever ownership, lifecycle, security, or rollback boundaries no longer align.
