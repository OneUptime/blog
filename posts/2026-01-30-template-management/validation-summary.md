# Validation Summary: How to Build Template Management

## Status
validated

## Post Type
Tutorial / Architectural Guide

## Technologies Covered
- TypeScript (interface, class, async/await patterns)
- JSON Schema (draft-07)
- AJV (Another JSON Schema Validator)
- semver (Node.js semantic versioning library)
- Helm (Kubernetes templating)
- Jinja2 / nunjucks (Node.js port of Jinja2)
- Jsonnet
- Open Policy Agent (OPA) / Rego
- Kubernetes (labels, ServiceAccount, NetworkPolicy, ConfigMap)
- OpenAPI 3.0
- GitOps / ArgoCD
- YAML

## Sources Consulted
- npm registry for package existence verification
  - https://www.npmjs.com/package/@hanazuki/node-jsonnet
  - https://www.npmjs.com/package/ajv
  - https://www.npmjs.com/package/semver
  - https://www.npmjs.com/package/nunjucks
- bazel-contrib/rules_jsonnet GitHub project (confirming `@aspect/rules_jsonnet` is Bazel ruleset, not Node.js library)
- Helm CLI documentation (`helm template` command)
- JSON Schema draft-07 specification (http://json-schema.org/draft-07/schema)
- OPA Rego documentation (deny[msg] legacy v0 syntax)
- Kubernetes recommended labels (app.kubernetes.io/*)

## Issues Found
1. **Fabricated npm package `helm-template`** — The `HelmEngine` example used `require('helm-template')` with an invented API (`helm.render(template, { Values, Release })`). No such npm package exists. Helm's templating relies on Go's `text/template` plus Sprig and Helm-specific functions, which has no pure-JS reimplementation. **Fix:** Replaced the implementation with the standard real-world approach — shelling out to the `helm` CLI via `child_process.execFile` with `helm template`, writing the template and values to a temp dir, and cleaning up after.

2. **Misused package `@aspect/rules_jsonnet`** — The `JsonnetEngine` example imported `@aspect/rules_jsonnet`, which is not an npm package at all — it refers to Bazel build rules (`rules_jsonnet`) for compiling Jsonnet at Bazel build time, not a Node.js runtime evaluator. The `Jsonnet.evaluate(template, { ext_vars: ... })` API was fabricated. **Fix:** Replaced with the standard maintained Node.js binding `@hanazuki/node-jsonnet`, using its real API: `new Jsonnet()`, `extString(...)`, and `evaluateSnippet(template)`.

## Review Notes
- The AJV usage (`new Ajv({ allErrors: true })`, `compile`, `validate.errors` with `instancePath` and `keyword`) matches the AJV v7+ API and is correct.
- The semver library usage (`satisfies`, `gte`, `rcompare`) is correct.
- The nunjucks usage (`new nunjucks.Environment()`, `addFilter`, `renderString`) is correct.
- The Helm template variable syntax (`{{ .Values.name }}`) and Kubernetes label conventions (`app.kubernetes.io/*`) are correct.
- The Rego policy code uses the legacy v0 syntax (`deny[msg] { ... }`). This is still supported by OPA but Rego v1 (the new default in OPA 1.0+) prefers the `if` keyword and `contains` for partial rule sets. The syntax shown will work but readers using Rego v1 may need `import rego.v1` and updated syntax.
- The `parse_memory` function used in the resources policy is not an OPA built-in. OPA provides `units.parse_bytes("4Gi")` which returns bytes — readers implementing this verbatim should either use the built-in or define `parse_memory` themselves. Left as-is because the author may intend it as a custom helper, and the surrounding policy structure is valid.
- Many functions throughout (e.g., `fetchFromRegistry`, `loadSchema`, `loadPolicies`, `loadFile`, `applyOverlays`, `resolveTemplate`) intentionally `throw new Error('Not implemented')` as illustrative placeholders. This is clearly signposted by the author and is appropriate for an architectural guide.
- The JSON Schema, OpenAPI 3.0, and YAML examples are well-formed and use accurate field names and structures.
