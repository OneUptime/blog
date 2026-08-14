# Assert Terraform Plan JSON Without Brittle Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Plan JSON, Infrastructure Testing, Jq, CI/CD, Policy as Code

Description: Test stable Terraform plan invariants instead of snapshotting volatile provider output, while handling replacements, unknown values, and sensitive data safely.

---

Terraform plan JSON is valuable test input because it exposes resource addresses, planned actions, before and after values, unknown-value metadata, configuration, and checks in a machine-readable form. It is also a poor golden file. Provider upgrades, schema versions, ordering, computed attributes, and unrelated defaults can change a full JSON document without changing the behavior your module promises.

Assert a small set of stable invariants instead. Generate a real saved plan for the current configuration, query only fields tied to the contract, and make failure output explain which resource violated the rule.

## Generate JSON From a Saved Plan

`terraform plan` does not produce the full machine-readable plan document directly. Save a binary plan, then ask the same Terraform CLI to render it:

```bash
set -euo pipefail

work_dir="$(mktemp -d)"
plan_file="$work_dir/plan.bin"
json_file="$work_dir/plan.json"
trap 'rm -f "$plan_file" "$json_file"; rmdir "$work_dir"' EXIT

terraform init -input=false
terraform plan -input=false -out="$plan_file"
terraform show -json "$plan_file" > "$json_file"

jq -e '.format_version | strings | test("^1\\.[0-9]+$")' "$json_file" >/dev/null
```

Use an isolated, access-controlled working directory in CI. HashiCorp warns that `terraform show -json` displays sensitive values in plaintext. Do not print the document, upload it as an unrestricted artifact, or retain it beyond the job merely for debugging. A Terraform `sensitive` mark controls presentation in normal output; it is not encryption of plan or state artifacts.

Render with the Terraform version and provider schemas that created the plan. A saved plan is not a portable long-term fixture. If provider schema versions have changed, `terraform show` may require the state to be upgraded, and `terraform show -json` requires a plan created without `-refresh=false`.

## Understand the Fields You Are Testing

The most useful top-level collections include:

- `resource_changes`, which describes each resource instance and its `change.actions`;
- `planned_values`, which describes the planned state but may omit unknown values or represent them as `null`;
- `configuration`, which represents configuration expressions rather than remote behavior;
- `output_changes`, which describes root output changes;
- `checks`, when present for the Terraform version in use.

For a resource change, action arrays have defined meanings. Common values are `["no-op"]`, `["create"]`, `["read"]`, `["update"]`, `["delete"]`, and `["forget"]`; replacements are represented by `["delete", "create"]`, `["create", "delete"]`, or `["create", "forget"]`. The order of a create/delete replacement pair conveys create-before-destroy versus destroy-before-create behavior, so do not sort it if ordering is the property under test.

Values that will be learned only during apply are represented through structures such as `after_unknown` and `proposed_unknown`; in `planned_values`, they can be omitted or set to `null`, making them indistinguishable from absent or null values. Sensitive paths have parallel metadata. A good assertion fails with an explicit unknown-value message when it requires a value that cannot exist at plan time.

## Assert Sets and Predicates, Not the Entire Document

Suppose a module contract requires exactly one managed bucket, prohibits deletion, and requires its encryption setting to be enabled. Query those facts directly:

```bash
jq -e '
  [
    (.resource_changes // [])[]
    | select(.mode == "managed" and .type == "example_bucket")
  ] as $buckets
  | ($buckets | length) == 1
  and all($buckets[]; (.change.actions | index("delete") | not))
  and all($buckets[]; .change.after.encryption.enabled == true)
' "$json_file" >/dev/null
```

`example_bucket` is intentionally provider-neutral; replace it and the attribute path with the schema documented by the provider you use. Keep the predicate close to a plain-language contract. When it fails, print a narrow diagnostic rather than the full plan:

```bash
jq -r '
  (.resource_changes // [])[]
  | select(.mode == "managed" and .type == "example_bucket")
  | {address, actions: .change.actions, encryption: .change.after.encryption}
' "$json_file"
```

Before printing any `before` or `after` subtree, decide whether it can contain credentials, connection strings, private keys, or other sensitive values. Redact by an allowlist of safe fields, not a denylist of known secret names.

## Detect Replacements Without Assuming Action Order

A blanket rule that forbids replacement should detect both create/delete orders and create/forget replacements:

```bash
jq -e '
  [
    (.resource_changes // [])[]
    | select(
        (.change.actions | index("create")) != null
        and (
          (.change.actions | index("delete")) != null
          or (.change.actions | index("forget")) != null
        )
      )
  ] | length == 0
' "$json_file" >/dev/null
```

If one address is intentionally replaced, assert that address and preserve order explicitly:

```bash
jq -e '
  any(
    (.resource_changes // [])[];
    .address == "example_service.app"
    and .change.actions == ["create", "delete"]
  )
' "$json_file" >/dev/null
```

That second check claims create-before-destroy. It should exist only if the resource can have old and new objects concurrently, including name and quota constraints. Terraform may propagate `create_before_destroy` to dependencies, so also inspect the complete replacement set rather than checking only the originally edited resource.

## Handle Unknown Values Deliberately

Consider a URL computed by a remote API. An assertion such as `.change.after.url | startswith("https://")` may error or compare a missing value because the URL is unknown until apply.

Choose one of three responses:

1. Assert only that the value is expected to be unknown at plan time.
2. Use a provider mock with a format-correct explicit override if the downstream HCL logic is what matters.
3. Run an apply-based test and assert the actual output or service behavior.

For the first option, inspect the corresponding unknown metadata using the provider's JSON shape. Do not replace an unknown with an empty default merely to make the policy easy to write. OPA's Terraform guidance also calls out unknown values as a limitation of plan-time policy evaluation.

## Normalize Only Volatile Details

If a team keeps small plan fixtures to unit-test a policy parser, normalize at the parser boundary:

- retain `format_version` and reject an unsupported major format;
- project resource changes into stable fields such as address, type, mode, actions, and selected contract attributes;
- sort collections only when their order is semantically irrelevant;
- represent unknown and sensitive status explicitly;
- omit timestamps, unrelated provider-specific metadata, and unrelated computed defaults.

For example, create a compact review projection:

```bash
jq '
  [
    (.resource_changes // [])[]
    | {
        address,
        mode,
        type,
        actions: .change.actions,
        unknown: .change.after_unknown
      }
  ]
  | sort_by(.address)
' "$json_file"
```

This projection can still change when the module's resource graph changes, which is often worth reviewing. It is not a substitute for targeted pass/fail predicates. Snapshot approval can accidentally bless a destructive action hidden among hundreds of provider-default changes.

## Keep Policy and Module Tests at the Right Boundary

Use module assertions for promises local to the module: output shape, mutually exclusive resources, or a lifecycle decision. Use OPA, Sentinel, or another policy engine for organization-wide rules such as prohibited public ingress or forbidden resource types. Both can consume plan information, but their ownership and failure messages should differ.

Policy code needs its own tests with small positive and negative inputs. Do not generate a live cloud plan for every Rego unit test. Separately run the policy against a real plan in CI to detect integration drift in the JSON adapter.

Pin or validate the plan JSON `format_version`. Terraform documents that format versions use a major and minor scheme; readers should reject unsupported major versions and ignore unknown object properties to tolerate compatible additions. The `checks` representation is experimental and may change even in minor Terraform CLI releases. Do not bind a parser to every field being present.

## Build Failure Messages for Reviewers

A useful failure names the violated invariant and the affected addresses. For example:

```text
Plan invariant failed: no database replacement is allowed in a pull request.
Affected address: module.database.example_database.primary
Actions: ["delete","create"]
```

Avoid merely returning jq exit code 1. A reviewer should know whether the failure is a deliberate replacement needing approval, an unknown plan-time value, or a parser incompatibility. Keep the human-readable `terraform show` output available only under the same sensitive-artifact controls as JSON.

## Official Documentation

- [Terraform show command](https://developer.hashicorp.com/terraform/cli/commands/show)
- [Terraform plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform JSON output format](https://developer.hashicorp.com/terraform/internals/json-format)
- [Terraform sensitive data guidance](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
- [Terraform lifecycle meta-argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Open Policy Agent Terraform integration](https://www.openpolicyagent.org/docs/terraform)
- [jq manual](https://jqlang.org/manual/)

## Conclusion

Treat Terraform plan JSON as a structured interface, not a golden text file. Save and render a fresh plan, protect it like state, validate the format, and query only the actions and attributes that express a durable contract. Explicit handling for replacement order, unknown values, and narrow diagnostics produces tests that catch dangerous changes without failing on every provider detail.
