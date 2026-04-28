# Validation Summary: How to Configure NeuVector Network Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NeuVector (container runtime security)
- Kubernetes
- NeuVector REST API (`/v1/policy/rule`, `/v1/log/violation`)
- NeuVector CRDs (`NvSecurityRule`, `NvClusterSecurityRule`)
- curl / jq for API automation
- YAML / kubectl for declarative policy

## Sources Consulted
- NeuVector CRD documentation: https://open-docs.neuvector.com/policy/usingcrd/
- SUSE NeuVector CRD docs (5.4): https://documentation.suse.com/cloudnative/security/5.4/en/usingcrd.html
- NeuVector Network Rules documentation: https://open-docs.neuvector.com/policy/networkrules/
- NeuVector REST API spec (apis.yaml): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml
- NeuVector Helm chart CRD definitions: https://github.com/neuvector/neuvector-helm/blob/master/charts/crd/templates/crd.yaml
- NeuVector Security Policy Overview: https://open-docs.neuvector.com/policy/overview/

## Issues Found

1. **Wrong HTTP method for `/v1/policy/rule` rule insertion (Steps 3, 6, 7).** The post used `POST` to create network rules. Per the official Swagger spec (`apis.yaml`), this endpoint supports only `GET`, `PATCH`, and `DELETE` — rule insertion is performed via `PATCH` with a `RESTPolicyRuleActionData` body containing an `insert` block. Changed all three `curl -X POST` calls to `curl -X PATCH`.

2. **Invalid `cfg_type` value `"user"`.** The `cfg_type` enum in the official API definition is `[learned, user_created, ground, federal]`. The post used `"user"`, which is not a valid value. Replaced all four occurrences with `"user_created"`.

3. **CRD selector format used Kubernetes `matchLabels` instead of NeuVector's `name`+`criteria` schema (Steps 4 and 5).** NeuVector's `NvSecurityRule`/`NvClusterSecurityRule` CRD uses a NeuVector-specific selector with `name` (group identifier) and `criteria` (array of `{key, op, value}`). The post's `selector.matchLabels` would be rejected by the CRD's OpenAPI schema. Rewrote all selectors to the correct format using `service`/`domain`/`container` keys with `=` operators.

4. **CRD `ports` field used wrong type (Steps 4 and 5).** The CRD schema defines `ports` as a string in `protocol/port` format (e.g., `"tcp/8080"`), not an array of objects with `protocol`/`port` sub-fields. Replaced every `ports: - protocol: TCP / port: N` block with the correct `ports: "tcp/N"` string form.

5. **Step 5 used invalid `nv.ip.ext` label-style selectors.** The reserved external-IP group in NeuVector is `nv.ip.external`, and rules reference it via the selector `name: external` (with empty `criteria`), not via a `matchLabels: { nv.ip.ext: "" }` map. Rewrote the deny/allow rules to use `name: external, criteria: []`. Also moved the rule descriptions out of the unsupported `comment` field on egress entries (the egress item schema does not include a `comment` field — the rule `name` plus the `target.selector.comment` carry that role).

6. **Wrong event endpoint and response field names (Step 8).** The post called `GET /v1/event?type=network`, which does not exist. The correct endpoints are `/v1/log/event`, `/v1/log/violation`, `/v1/log/incident`, `/v1/log/threat`, `/v1/log/security`. For "network rule violations" specifically, `/v1/log/violation` is the correct path, and its response is keyed under `violations` (not `events`) with a `Violation` schema. Updated the URL, top-level key, and `jq` field names (`client_name`, `server_name`, `server_port`, `policy_action`, `reported_at`) to match the actual `Violation` schema.

## Review Notes
- The narrative claims (Layer 7 inspection, learn → discover → protect workflow, GitOps via CRDs, default-deny via Protect mode + explicit deny rules, distinction from Kubernetes NetworkPolicies) are all accurate.
- The `GET /v1/policy/rule` call in Step 1 includes `start=0&limit=100` query parameters. The official Swagger only documents the `scope` query parameter on this endpoint; `start`/`limit` are not formally documented, but unknown query parameters are typically ignored by the controller, so this was left as-is.
- The `from: "any"` and `to: "any"` group references in Step 7 are unusual but appear in published NeuVector examples (e.g., the SUSE policy-as-code blog) and are accepted as free-form group strings by the API; left unchanged.
- The Step 2 UI-rule example uses `Ports: TCP/8080` in upper-case as a UI display value. The API form is lower-case `tcp/8080`, which the post already uses correctly in the API examples.
- Future enhancement: the post could also mention `NvGroupDefinition` for declarative group creation alongside the rule CRDs, and clarify that the `policymode` field is namespace-scoped on `NvSecurityRule` but cluster-scoped on `NvClusterSecurityRule` (the NvClusterSecurityRule's `policymode` is often left `null`/unset because the cluster-rule resource is typically used for rules rather than mode configuration).
