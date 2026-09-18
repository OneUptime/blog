# Avoid Duplicate Protobuf Symbols Across gRPC Packages with Shared Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Protobuf, Go, API Design, Troubleshooting

Description: Resolve duplicate protobuf symbols by separating protobuf namespaces from language packages and generating shared contracts from one canonical owner.

---

Two gRPC SDKs work independently, but a service importing both fails with a protobuf registration conflict. Moving one generated file to a different Go package may make the compiler happy while leaving the runtime collision unchanged.

The underlying problem is usually that two packages claim ownership of the same protobuf declaration. Fix the schema and dependency graph so a shared type has one canonical definition and one generated implementation per language within the final application.

## Identify Which Name Collides

There are three separate names to inspect:

| Name | Example | Purpose |
| --- | --- | --- |
| Proto import path | `acme/common/v1/money.proto` | Locates the schema file |
| Proto package and message | `acme.common.v1.Money` | Identifies the protobuf declaration |
| Go import path | `example.com/acme/contracts/gen/common/v1` | Locates generated Go code |

Changing `go_package` changes a language import path. It does not rename `acme.common.v1.Money`. The Go generated-code guide explicitly separates these namespaces. [Go protobuf packages](https://protobuf.dev/reference/go/go-generated/#package).

Record the exact conflicting declaration, both generated source locations, and the final binary that links them. A panic naming a file descriptor can also indicate the same proto import path was generated twice. Do not limit investigation to the short message name.

## Look for Copied Common Schemas

Suppose billing and shipping each copied this declaration into their own generated package:

```protobuf
syntax = "proto3";
package acme.common.v1;

message Money {
  string currency_code = 1;
  int64 minor_units = 2;
}
```

Both packages register `acme.common.v1.Money`. The conflict can occur even when their Go structs have different import paths and identical field definitions.

Go protobuf registers linked declarations globally. The official FAQ identifies repeatedly generating vendored schemas and overly generic proto package names as common causes. [Go protobuf namespace conflicts](https://protobuf.dev/reference/go/faq/#namespace-conflict).

Search the source tree and generated outputs:

```bash
rg -n '^package |^option go_package|^message Money' --glob '*.proto' .
rg -n 'money.proto|acme.common.v1' --glob '*.pb.go' .
go list -deps -f '{{.ImportPath}} {{.Dir}}' ./cmd/api
```

Run the commands in the affected Go module, replacing `./cmd/api` with its entry point. Inspect the modules behind both generated imports. A dependency update can introduce a second copy through a transitive SDK even when your direct imports did not change.

## Give the Shared Contract One Owner

Put the canonical schema in a shared contracts module:

```protobuf
// acme/common/v1/money.proto
syntax = "proto3";
package acme.common.v1;

option go_package = "example.com/acme/contracts/gen/common/v1";

message Money {
  string currency_code = 1;
  int64 minor_units = 2;
}
```

Billing imports it instead of redeclaring it:

```protobuf
// acme/billing/v1/invoice.proto
syntax = "proto3";
package acme.billing.v1;

import "acme/common/v1/money.proto";

option go_package = "example.com/acme/contracts/gen/billing/v1";

message Invoice {
  string id = 1;
  acme.common.v1.Money total = 2;
}
```

Shipping should follow the same pattern. Generate the shared Go package once, publish it through the contracts module, and make both service SDKs import that package. Copying the canonical generated file into each SDK still produces multiple runtime owners when both copies are linked.

Standardize the import root used by code generation. A file should be imported under one stable proto path rather than being addressed through several combinations of repository-relative paths and include directories. Proto imports are resolved using the compiler's configured search paths. [Importing protobuf definitions](https://protobuf.dev/programming-guides/proto3/#importing).

## Check the Complete Schema Graph

Compile the schemas together before generating SDKs:

```bash
protoc -I proto \
  --include_imports \
  --descriptor_set_out=/tmp/contracts.pb \
  acme/common/v1/money.proto \
  acme/billing/v1/invoice.proto
```

This command assumes the examples live beneath `proto/`. Add the shipping schema and other service roots to the same check. A unified descriptor build catches declaration collisions that separate service builds may miss.

It does not prove the final Go dependency graph is clean. Also build and start a small test executable that imports every SDK shipped together. Registration problems often occur during initialization, before a request or unit-test function runs.

Include a round-trip test where one SDK constructs a shared message and another consumes it. Verify the descriptor's fully qualified name and the generated package identity, not just matching JSON output.

## Do Not Rename Published Packages Casually

If two unrelated teams independently created `common.Money`, they may need distinct, organization-qualified proto packages. For unpublished contracts, fix the namespace before release.

For published APIs, a package rename can affect gRPC service method paths and type URLs in `google.protobuf.Any`. It is a migration, not merely an import cleanup. Inventory stored `Any` values, reflection users, service clients, and language SDKs before choosing a new namespace. [Protocol Buffers Go compatibility warning](https://protobuf.dev/reference/go/faq/#fix-namespace-conflict).

For a third-party schema, depend on the owner's generated package where possible. If it lacks a stable language mapping, coordinate a canonical mapping across consumers instead of quietly generating another local copy.

## Verify the Dependency Fix

Remove stale generated copies only after their users have switched to the shared package. Regenerate in a clean output directory and ensure the build does not pick up old files from a previous generation run.

Do not treat a warning-mode registry override as the completed fix. It leaves an ambiguous declaration graph and can defer the failure until reflection or dynamic message resolution.

The durable result is a graph in which billing and shipping both point to the same shared contract. A build that succeeds only when one SDK is removed has not yet established that ownership.
