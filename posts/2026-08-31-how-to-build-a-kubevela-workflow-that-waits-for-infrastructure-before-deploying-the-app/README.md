# How to Build a KubeVela Workflow That Waits for Infrastructure Before Deploying the App

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Workflow, Application Delivery, Continuous Delivery

Description: Gate KubeVela application deployment on an infrastructure Application's reported health with explicit workflow dependencies, timeouts, and safe failure handling.

---

Delivery ordering is useful only when the prerequisite has a meaningful health signal. Waiting for an infrastructure manifest to be accepted is not enough; its controller, CRDs, credentials, network endpoints, and produced resources may still be unavailable. KubeVela provides two useful levels of dependency:

- component `dependsOn` waits for another component in the same Application to become healthy; and
- the built-in `depends-on-app` workflow step waits for another KubeVela Application to complete.

Use separate Applications when infrastructure has a different owner, lifecycle, RBAC boundary, or rollback policy. Use components together only when they genuinely form one release unit.

## Define the infrastructure health contract

Assume the platform team owns an Application named `orders-infrastructure` in namespace `platform`. Before the workload waits on it, decide what “running” means. Its component definitions should report unhealthy until the required resources are ready-for example, a database custom resource has a Ready condition and its connection Secret exists.

Check the prerequisite directly:

```bash
vela status orders-infrastructure --namespace platform --tree --detail
kubectl get application orders-infrastructure --namespace platform -o yaml
```

If the infrastructure Application reports success immediately after merely submitting a cloud resource, fix its ComponentDefinition health policy or add a purpose-built verification step. A sleep duration is not a readiness contract.

## Wait with `depends-on-app`

The workload Application can define its components without applying them through the default workflow, then use explicit steps:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: orders-api
  namespace: apps
  annotations:
    app.oam.dev/publishVersion: "orders-api-2.3.0"
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
          - name: DATABASE_PASSWORD
            valueFrom:
              secretKeyRef:
                name: orders-database
                key: password

  workflow:
    steps:
      - name: wait-for-infrastructure
        type: depends-on-app
        timeout: 20m
        properties:
          name: orders-infrastructure
          namespace: platform

      - name: deploy-api
        type: apply-component
        dependsOn:
          - wait-for-infrastructure
        properties:
          component: api
```

Replace the image placeholder with a real digest. The Secret is referenced, not embedded. A secret-management controller or infrastructure workflow must create it in the workload namespace before the Pod starts.

The official `depends-on-app` documentation says it waits until the named Application is running. It can also look for a same-named ConfigMap containing serialized Application YAML when the Application does not exist. That fallback is powerful but broadens trust: do not leave user-writable ConfigMaps in a namespace where a privileged workflow will interpret them as infrastructure Applications. Prefer creating and authorizing the dependency explicitly.

Confirm installed step schemas:

```bash
vela show depends-on-app
vela show apply-component
```

## Add a bounded wait

KubeVela workflow steps support a `timeout`. Without a bound, a missing or permanently unhealthy dependency can leave a release running indefinitely. Choose a duration from the infrastructure SLO, not guesswork. When a step times out, later steps are skipped or blocked according to workflow semantics; it should not deploy the API anyway.

Timeout is failure handling, not cancellation of the infrastructure Application. Decide who owns cleanup of a partially provisioned database, load balancer, or cloud account. Automated deletion after a timeout can destroy a slow but valid resource and should be designed separately.

## Use same-Application component dependencies when appropriate

For a tightly coupled controller and custom resource, component `dependsOn` can be simpler:

```yaml
spec:
  components:
    - name: database-operator
      type: helmchart
      properties:
        chart:
          source: database-operator
          repoURL: https://example.invalid/charts
          version: "<pinned-version>"
        healthStatus:
          - resource:
              kind: Deployment
              name: database-operator
            condition:
              type: Available
              status: "True"

    - name: database
      type: k8s-objects
      dependsOn:
        - database-operator
      properties:
        objects:
          - apiVersion: database.example.io/v1
            kind: Database
            metadata:
              name: orders
```

The repository, chart, resource API, and Deployment name are intentionally illustrative; replace all of them with values from the selected chart. The current component reference documents the Helm-SDK-backed `helmchart` and `k8s-objects` types shown here. Older component-orchestration examples use the FluxCD-backed `helm` type, which requires the `fluxcd` addon and has a different schema. Inspect `vela show helmchart` and `vela show k8s-objects` on the installed release rather than mixing schemas.

`dependsOn` waits for KubeVela's component health. The current `helmchart` type is considered healthy immediately after dispatch when `healthStatus` is omitted, which is why the example adds an explicit Deployment condition. A ready Deployment still may not prove that an admission webhook has endpoints and CA injection is complete; define health to cover the actual prerequisite.

## Pass outputs instead of rediscovering them

When infrastructure produces a nonsecret endpoint or identifier, KubeVela workflow step outputs and inputs can pass data to a later step. The built-in `read-object` step places the fetched object under `output.value`, and an output expression can select a status field. Keep these rules typed and narrow.

Do not pass secret values through Application status, workflow logs, or plain ConfigMaps. Materialize sensitive values as Kubernetes Secrets and pass only names/keys. Ensure the target Pod's ServiceAccount has no unnecessary read access to other Secrets.

## Observe why a workflow is waiting

```bash
vela up --file orders-api.yaml --namespace apps
vela status orders-api --namespace apps --tree --detail
kubectl get application orders-api --namespace apps -o yaml
```

Inspect the `wait-for-infrastructure` phase and message, then inspect the dependency's own workflow and services. If the dependency does not exist, validate name, namespace, and RBAC. If it exists but is unhealthy, move the investigation to its resource tree; resuming the dependent workflow cannot fix it.

KubeVela also provides workflow debug and logs commands, but logs require the step definition to expose log configuration, and official debugging guidance warns that debug execution touches the real environment. Prefer read-only status in production and reproduce custom-step logic in a test namespace.

## Make retries idempotent

Workflow restarts can re-execute steps. Infrastructure operations must tolerate seeing an existing resource and must not create a new database, DNS zone, or billing account on every retry. Use declarative objects with stable names, controller reconciliation, and idempotency keys for external APIs. Record step side effects and ownership.

After a timeout or definition fix, publish a new Application version if desired state changed. Resume only an intentional suspension; use restart after reviewing which steps will run again.

## Official Documentation

- [KubeVela built-in workflow steps](https://kubevela.io/docs/end-user/workflow/built-in-workflow-defs/)
- [KubeVela component orchestration](https://kubevela.io/docs/end-user/workflow/component-dependency-parameter/)
- [KubeVela workflow dependencies](https://kubevela.io/docs/end-user/workflow/dependency/)
- [KubeVela workflow step timeout](https://kubevela.io/docs/end-user/workflow/timeout/)
- [KubeVela workflow inputs and outputs](https://kubevela.io/docs/end-user/workflow/inputs-outputs/)

## Conclusion

Wait on a health contract, not elapsed time. Use `depends-on-app` for independently owned infrastructure and component `dependsOn` for one release unit, then bound the wait with a timeout and apply the workload explicitly. Keep secrets in Secrets, make every provisioning step idempotent, and follow the dependency's resource tree when the gate remains blocked.
