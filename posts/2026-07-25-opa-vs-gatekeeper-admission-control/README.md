# OPA vs Gatekeeper: What Actually Runs Where in Kubernetes Admission Control?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OPA, Gatekeeper, Kubernetes, Admission Control, Policy as Code

Description: Learn where Kubernetes, Gatekeeper, and OPA each run, how an admission request reaches policy code, and where audit fits into the design.

---

Gatekeeper and Open Policy Agent are often described as if they were interchangeable. They are not. OPA is the policy evaluation engine. Gatekeeper is a Kubernetes-native policy controller that embeds OPA and connects it to admission, custom resources, audit, mutation, and operational tooling.

That distinction matters when a policy appears to be missing, when a webhook is unavailable, or when you are deciding which component to monitor.

## The request path

For a typical create or update, the path looks like this:

```text
kubectl or controller
        |
        v
Kubernetes API server
  authentication and authorization
  mutating admission
  validating admission
        |
        v
Gatekeeper webhook Service
        |
        v
Constraint matching and OPA evaluation
        |
        v
allow, warning, or denial
```

The API server decides whether a request matches Gatekeeper's webhook configuration. It then sends an `AdmissionReview` over HTTPS to Gatekeeper. Gatekeeper selects the relevant constraints, constructs policy input, asks its embedded policy engine to evaluate them, and returns an `AdmissionResponse`.

The API server does not call a standalone OPA REST endpoint in the normal Gatekeeper deployment.

## What OPA does

OPA evaluates policy against structured input and data. In a Gatekeeper validation policy, that input includes the admission request under `input.review`, while constraint parameters are available under `input.parameters`. Referential policies can also read resources replicated into `data.inventory`.

OPA is responsible for questions such as:

- Does this Pod use an unapproved image?
- Is a required label absent?
- Does this Ingress host conflict with an existing Ingress?
- Should this request produce one or more violations?

OPA does not register Kubernetes webhooks, create Gatekeeper custom resource definitions, periodically scan the cluster, or rotate the webhook certificate. Gatekeeper supplies those integrations.

## What Gatekeeper does

Gatekeeper turns policy evaluation into a Kubernetes control-plane service. Its validating webhook operation performs several jobs:

- Watches `ConstraintTemplate` and Constraint resources.
- Creates a Constraint custom resource definition for each valid template.
- Loads policy and constraint data into the evaluation engine.
- Serves the HTTPS validating webhook.
- Reports per-pod ingestion status.
- Watches resources requested by referential policies.

Other Gatekeeper operations provide mutation, audit, and policy generation. They can run together or be separated with the `--operation` flag. A common production layout uses replicated controller-manager Pods for admission and a singleton audit Pod. Separating audit prevents a large scan or out-of-memory event from taking down the admission endpoint.

## Where the policy resources live

Policy configuration remains in the Kubernetes API:

```text
ConstraintTemplate
  defines policy code, parameter schema, and Constraint kind

Constraint
  selects resources, supplies parameters, and chooses enforcement

Config or SyncSet
  requests replicated Kubernetes data when a policy needs cluster state
```

Gatekeeper watches these resources and loads their effective state into each serving replica. This is why `kubectl apply` succeeding is not the final health check. The template and constraint status must also show successful ingestion by the Gatekeeper Pods.

Use these read-only checks:

```bash
kubectl get constrainttemplates
kubectl get constraints
kubectl get constrainttemplate <template-name> -o yaml
kubectl get constraintpodstatus,constrainttemplatepodstatus \
  -n gatekeeper-system
```

If replicas disagree temporarily after a policy update, requests routed to different Pods can see different policy state. Watch the per-pod status before promoting a new constraint to `deny`.

## Where audit runs

Admission sees new requests. Audit evaluates objects that already exist.

The audit operation periodically lists or reads cached Kubernetes objects, evaluates them against constraints, writes counts and a capped list of violations to Constraint status, emits audit logs, and exposes audit metrics. It uses the same policy model, but it does not replay the original requesting identity or operation. Fields such as `input.review.userInfo` are unavailable during audit.

This explains a common apparent contradiction:

- A user-dependent policy can work during admission but be unauditable.
- A new `deny` constraint can block future objects without removing existing violations.
- Gatekeeper can fail open during a webhook outage, then report admitted violations in a later audit.

## Gatekeeper mutation is a separate path

Gatekeeper mutation uses `AssignMetadata`, `Assign`, `ModifySet`, and `AssignImage` resources rather than ConstraintTemplates and Constraints. Kubernetes completes mutating admission before validating admission. Gatekeeper validation therefore evaluates the final object after mutation, including changes made by other mutating webhooks.

Do not put defaulting behavior in a validation policy. Validation reports or rejects; mutation changes the request.

## A practical troubleshooting map

Work from the outside in:

1. Confirm the API server has the Gatekeeper webhook configurations.
2. Confirm the webhook Service has ready endpoints.
3. Confirm the TLS certificate and `caBundle` agree.
4. Confirm every Gatekeeper replica ingested the template and constraint.
5. Confirm the Constraint `match` includes the tested resource.
6. Confirm the policy reads the correct `input.review` fields.
7. Check audit separately if the issue concerns existing resources.

```bash
kubectl get validatingwebhookconfiguration \
  gatekeeper-validating-webhook-configuration -o yaml
kubectl get svc,endpoints -n gatekeeper-system \
  gatekeeper-webhook-service
kubectl get pods -n gatekeeper-system
kubectl logs -n gatekeeper-system \
  -l control-plane=controller-manager --since=10m
```

The useful ownership boundary is simple: Kubernetes decides when to call; Gatekeeper receives, matches, and operates; OPA evaluates policy logic.

## Official documentation

- [Gatekeeper introduction and OPA comparison](https://open-policy-agent.github.io/gatekeeper/website/docs/)
- [Gatekeeper operations architecture](https://open-policy-agent.github.io/gatekeeper/website/docs/operations/)
- [Gatekeeper admission review input](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)

