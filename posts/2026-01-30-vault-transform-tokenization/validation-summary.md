# Validation Summary: How to Create Vault Transform Tokenization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (Enterprise)
- Vault Transform secrets engine (tokenization)
- PostgreSQL (as external token store)
- Python `hvac` client library
- HCL (Vault policy language)
- Mermaid (for diagrams)

## Sources Consulted
- HashiCorp Vault Transform Secrets Engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/transform
- HashiCorp Vault Transform Tokenization overview: https://developer.hashicorp.com/vault/docs/secrets/transform
- HashiCorp Vault Transform tokenization key rotation reference (same API doc, key rotation section)
- `hvac` Python client documentation for `secrets.transform.encode`/`decode`

## Issues Found

1. **Incorrect PostgreSQL driver name** in the SQL store configuration.
   - Was: `driver=postgresql`
   - Fixed to: `driver=postgres`
   - The Vault Transform SQL store driver value for PostgreSQL is `postgres`, per the official API documentation example. The `connection_string` URI scheme can still use `postgresql://`.

2. **Token Rotation section described a non-existent endpoint and incorrect behavior.**
   - The post claimed `vault write transform/rotate/payments value=... transformation=credit-card` would rotate an individual token and invalidate the old one. No such endpoint exists in Vault Transform, and individual tokens cannot be rotated this way.
   - Replaced with the correct tokenization key rotation endpoint: `vault write -f transform/tokenization/keys/credit-card/rotate`. Also clarified that existing tokens remain decodable through retained key versions, and added the `min_decryption_version` configuration command (via `transform/tokenization/keys/:name/config`) for phasing out older key versions.
   - The section heading was renamed from "Token Rotation" to "Tokenization Key Rotation" to accurately reflect what is being rotated.

3. **Delete Tokens section used a non-existent endpoint and wrong parameter name.**
   - Was: `vault write transform/delete/payments value="tok_..." transformation=credit-card`
   - Fixed to: `vault delete transform/tokens/payments token="tok_..." transformation=credit-card`
   - The actual endpoint is `DELETE /transform/tokens/:role_name` and the parameter is `token`, not `value`.

4. **Missing note that Transform is a Vault Enterprise feature.**
   - Added a one-sentence note in the introduction clarifying that the Transform secrets engine (and tokenization) is a Vault Enterprise feature, not available in the open-source edition. Without this, readers attempting to follow the tutorial on OSS Vault would hit a "no handler for route" error.

## Review Notes

- The `/transform/validate/:role_name` endpoint with `value=<token>` is correct and was kept as-is — verified against API docs.
- The `/transform/metadata/:role_name` endpoint with `value=<token>` is correct and was kept as-is.
- The encode/decode endpoints (`transform/encode/:role_name`, `transform/decode/:role_name`) and their CLI parameter shapes match the official API.
- The role creation path (`transform/role/:name`) and transformation creation path (`transform/transformations/tokenization/:name`) are correct.
- The `mapping_mode` description (`default` vs `exportable`) is accurate.
- The `hvac` Python client method names (`client.secrets.transform.encode`, `decode`) and the documented response shapes (`response['data']['encoded_value']`, `decoded_value`, `batch_results`) align with the library's current API.
- The HCL policy paths (`transform/encode/payments`, `transform/decode/payments`, `transform/validate/payments`) all reference real endpoints. Note that to support the deletion workflow shown later in the post, a service would also need `delete` capability on `transform/tokens/payments`; this isn't strictly an error since the policy section predates the delete section, but readers should be aware.
- Test card numbers used (`4111-1111-1111-1111` Visa, `5500-0000-0000-0004` Mastercard, `3400-0000-0000-009` Amex 15-digit) are valid format-test PANs.
- The post does not specify a Vault version. As of mid-2026, the Transform API surface described here matches current Vault Enterprise behavior, but future versions could change endpoint semantics — a version note would help readers cross-reference docs.
