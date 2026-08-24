# How to Generate Useful Negative and Boundary Tests from an OpenAPI Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, OpenAPI, JSON Schema, Negative Testing, Boundary Testing, Test Generation

Description: Turn OpenAPI constraints into focused invalid and edge-case requests while respecting schema dialects, parameter serialization, and API-specific error contracts.

---

An OpenAPI description can generate far more useful tests than one happy example per endpoint. Its parameters, media types, and Schema Objects describe types, required values, numeric and length bounds, enumerations, patterns, array cardinality, object properties, and composed alternatives.

Useful generation is not “send random garbage.” Start from a known-valid request, mutate one contract rule at a time, and verify both that the server rejects the request as documented and that rejection produces no forbidden side effect.

## Pin the OAS Version and Schema Dialect

OpenAPI 3.2.0 is the latest published OAS version at the time of writing. Its Schema Object is a superset of JSON Schema Draft 2020-12 and uses the OpenAPI dialect. Older OpenAPI 3.0 documents have materially different schema behavior. A generator must read the root `openapi` value, honor `jsonSchemaDialect` and resource-root `$schema`, and use a resolver that understands the declared version.

Do not flatten `$ref` by copying fragments without base-URI handling. JSON Schema references, `$id`, anchors, dynamic references, `allOf`, `anyOf`, and `oneOf` affect the evaluated schema. The OpenAPI specification requires complete-document parsing to locate reference targets.

Before generating HTTP traffic:

1. validate the OpenAPI document structurally;
2. resolve the target operation and all relevant references safely;
3. identify parameter locations and serialization rules;
4. choose a request-body media type;
5. select the effective request schema and dialect; and
6. locally validate every generated baseline and mutation.

If the local validator says the “valid” baseline is invalid, stop. Otherwise a server rejection tells you nothing.

## Build a Known-Valid Baseline

Prefer a reviewed request example only after validating it against the schema. Otherwise generate a minimal valid instance:

```yaml
openapi: 3.2.0
paths:
  /orders:
    post:
      operationId: createOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [sku, quantity, shippingMethod]
              additionalProperties: false
              properties:
                sku:
                  type: string
                  minLength: 3
                  maxLength: 20
                  pattern: '^[A-Z0-9-]+$'
                quantity:
                  type: integer
                  minimum: 1
                  maximum: 100
                shippingMethod:
                  type: string
                  enum: [standard, express]
```

A minimal valid body is:

```json
{
  "sku": "SKU-1",
  "quantity": 1,
  "shippingMethod": "standard"
}
```

Create each negative case by cloning this baseline and violating exactly one rule. This yields an actionable name such as `POST /orders rejects quantity below minimum`, instead of a payload that simultaneously has a missing SKU, wrong content type, bad enum, and malformed JSON.

## Map Constraints to Mutations

Generate both valid boundaries and one focused invalid value where representable:

| Schema or OpenAPI rule | Valid cases | Focused negative case |
| --- | --- | --- |
| `required: [sku]` | property present with valid value | omit `sku` |
| `type: integer` | `1`, `100` | string `"1"`, boolean, or non-integer number `1.5` |
| `minimum: 1` | `1` | integer `0` |
| `maximum: 100` | `100` | integer `101` |
| `exclusiveMinimum: 0` | a documented representable value greater than 0 | `0` |
| `minLength: 3` | exactly 3 code points | 2 code points |
| `maxLength: 20` | exactly 20 code points | 21 code points |
| `enum` | every declared value | same-type value outside enum |
| `pattern` | a generated matching string | same-type non-matching string |
| `minItems` / `maxItems` | arrays at both bounds | one item below or above |
| `uniqueItems: true` | distinct elements | duplicate a valid element |
| `additionalProperties: false` | declared properties only | add one unknown property |
| parameter `required: true` | serialized valid value | omit parameter entirely |
| required request body | valid body with declared media type | omit body |

Numeric “just outside” values require care. For integers, `minimum - 1` and `maximum + 1` are straightforward within supported ranges. For arbitrary decimals and floating-point formats, do not invent a universal epsilon; use exact decimal or rational generation, or choose a clearly outside value the implementation can represent.

JSON Schema string length is defined in Unicode code points, while many languages expose UTF-16 code units or bytes. Include emoji and combining characters so a server does not accidentally enforce byte length when the schema promises character length.

## Remember That Keywords Do Not Imply Types

In JSON Schema, a type-specific keyword applies only to instances of the relevant type. `pattern` does not make a value a string, and `minimum` does not make it a number. OpenAPI 3.2 explicitly calls this out. Write:

```yaml
type: string
pattern: '^[A-Z]+$'
```

rather than relying on `pattern` alone. A generator should not create a wrong-type negative for an unconstrained schema and claim the schema requires a string.

Similarly, `format` is a non-validating annotation by default in JSON Schema and OAS. An OpenAPI schema containing `type: string, format: email` does not automatically require every conforming validator to reject `not-an-email`. Generate a format-negative test only when the API contract or chosen dialect and tool configuration explicitly asserts that format.

## Exercise Composition Deliberately

Composition needs targeted logic:

- `allOf`: the instance must satisfy every subschema; violate one branch while satisfying the others.
- `anyOf`: a negative instance must fail every branch.
- `oneOf`: test both zero matching branches and, where possible, an ambiguous instance matching more than one branch.
- `not`: generate an instance that satisfies the forbidden subschema.
- `if` / `then` / `else`: generate cases that take each branch and violate its selected constraint.

Do not treat an OpenAPI discriminator as a substitute for schema validation. In OAS 3.2 it hints which `oneOf` or `anyOf` schema is expected; the schemas still determine validity. Test an unknown discriminator value, a known value with the wrong branch shape, and an instance that is ambiguous if the schema permits it.

Respect `readOnly` and `writeOnly` as annotations with direction-dependent application behavior. OpenAPI 3.2 allows the owning authority to ignore a read-only field in a request or treat it as an error. Only generate a rejection expectation if the API documents that choice.

## Serialize Parameters as OpenAPI Defines Them

Validating the in-memory value is only half the request. Query, path, header, and cookie parameters use OpenAPI `style`, `explode`, `allowReserved`, and encoding rules. An array might become repeated keys, comma-separated text, or another representation depending on location and configuration.

Generate separate tests for:

- a schema-invalid logical value serialized correctly;
- a valid logical value serialized incorrectly;
- missing required parameter versus present empty value;
- repeated values and reserved characters; and
- percent-encoding at path and query boundaries.

Do not serialize an object as JSON in a query string simply because its schema uses the JSON data model. Use the operation's Parameter Object.

For request bodies, vary the HTTP layer too: absent `Content-Type`, unsupported media type, valid media type with malformed bytes, valid JSON with schema-invalid data, and declared alternate media types. These are different failure modes and may have different responses.

## Assert the Documented Error Contract

OpenAPI does not universally require `400` or `422` for schema-invalid input. The operation's Responses Object and provider documentation define expected statuses and bodies. Select the expected response for each case rather than hard-coding one status for every API.

For each rejection, assert:

- the documented status and media type;
- stable machine-readable error type or code;
- a safe field or JSON Pointer when promised;
- no internal stack trace or secret leakage;
- no order, payment, event, or other durable effect; and
- response conformance to the described error schema.

Snapshotting a full human-readable message is usually brittle. Prefer structured fields and verify the message is present where required.

## Keep the Suite Small and High-Value

A large schema can produce millions of combinations. Use one-constraint mutations for pull-request coverage, then add pairwise or property-based combinations for interactions such as `dependentRequired`, cross-field dates, and composition branches. Deduplicate equivalent mutations after `$ref` resolution.

Prioritize unsafe operations, money and permission fields, boundary-sensitive pagination, and schemas recently changed. Assign every generated case a stable identity:

```text
operationId=createOrder
location=requestBody
mediaType=application/json
instancePath=/quantity
keyword=minimum
mutation=below
```

Record the OpenAPI artifact digest and generator version so a failure can be reproduced. A contract fetched from `latest` without a digest makes CI results non-deterministic.

## Know What the Schema Cannot Generate

OpenAPI and JSON Schema do not normally capture every business invariant. Examples include inventory availability, uniqueness under concurrency, authorization ownership, idempotency retention, rate-limit windows, clock skew, and whether `startDate` precedes `endDate` unless explicitly modeled.

Add hand-authored or model-based tests for those rules. Generated schema tests are a strong baseline for syntax and structure, not a replacement for domain behavior, security, concurrency, or workflow tests.

## Official Documentation

- [OpenAPI Specification 3.2.0](https://spec.openapis.org/oas/v3.2.0.html)
- [OpenAPI 3.2 Schema Object](https://spec.openapis.org/oas/v3.2.0.html#schema-object)
- [OpenAPI 3.2 Parameter Object](https://spec.openapis.org/oas/v3.2.0.html#parameter-object)
- [JSON Schema Draft 2020-12 Core](https://json-schema.org/draft/2020-12/json-schema-core)
- [JSON Schema Draft 2020-12 Validation](https://json-schema.org/draft/2020-12/json-schema-validation)

## Conclusion

Effective OpenAPI generation begins with a dialect-correct, locally validated request and changes one constraint at a time. Cover both valid edges and focused invalid values, serialize parameters at the HTTP layer, follow the operation's own error contract, and record contract provenance. The result is a compact suite that explains exactly which boundary failed while leaving business-only rules to purpose-built tests.
