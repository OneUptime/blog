# How to Fix AADSTS7000215 Without Confusing the Client Secret Value and Secret ID

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, AADSTS7000215, Client Secrets, OAuth 2.0, Client Credentials, Troubleshooting

Description: Resolve AADSTS7000215 by using the one-time client secret value, preserving form encoding, verifying the app and tenant, and rolling out rotation safely.

---

`AADSTS7000215` means Microsoft Entra rejected client authentication because the supplied client secret was invalid or the authentication parameters were incorrect. A common cause is copying the credential's **Secret ID** instead of its **Value**.

The distinction is fundamental:

| Portal/Graph field | What it is | Send as `client_secret`? |
| --- | --- | --- |
| Secret Value / Graph `secretText` | The confidential password | Yes |
| Secret ID / Graph `keyId` | Identifier for the credential record | No |
| Hint | First characters shown for identification | No |
| Application (client) ID | Identifies the app | Send separately as `client_id` |

Microsoft Graph returns a generated password's `secretText` only during the initial `addPassword` response. It cannot be retrieved later. If the value was not stored securely when created, create a new credential rather than attempting to reconstruct it from the Secret ID.

## First, Preserve the Exact Error

Record:

- `AADSTS7000215`;
- UTC timestamp;
- correlation and trace/request IDs;
- client ID and tenant ID;
- credential key/Secret ID and expiry, but not its value;
- deployment version and replica; and
- the authentication library and flow.

Do not paste the secret, raw HTTP body, or access token into chat, logs, screenshots, or a public JWT debugger.

Related codes narrow the problem:

- `AADSTS700016` means the application was not found in the tenant.
- `AADSTS7000215` means the presented secret/authentication data is invalid.
- `AADSTS7000222` means the supplied client-secret credentials are expired.
- `AADSTS7000218` means the request did not contain the required secret or client assertion.

For diagnosis, preserve the exact AADSTS number in addition to the generic `invalid_client` value. In application logic, react to the OAuth `error` field rather than depending on an AADSTS number.

## Step 1: Confirm You Have the Secret Value

In **Entra ID > App registrations > \<app\> > Certificates & secrets**, each secret row has identifying metadata. The Secret ID is safe for inventory and deletion operations; it is not the password.

If the value is gone:

1. create a new client secret with an appropriate short lifetime;
2. copy the **Value** immediately into the approved secret store;
3. label the credential so its owner and rollout are clear;
4. keep the old credential during an overlap window;
5. deploy and verify every workload instance; and
6. delete the old credential only after evidence shows it is unused.

Do not rotate by editing a displayed ID into the application's configuration.

## Step 2: Verify Client and Tenant Pairing

A secret created under **App registrations** is tied to that application registration. Pair it with that registration's Application (client) ID; do not pair it with:

- another app registration with the same display name;
- a service principal's Object ID in place of the Application ID;
- a managed identity; or
- a deleted and recreated app with a new client ID.

Microsoft Graph also supports password credentials created directly on `servicePrincipal` objects, particularly for intentionally managed or legacy service principals. That is a separate credential-ownership case: inspect the exact object and tenant that own the credential instead of assuming every password credential was created on an application object.

Confirm that the runtime values form one consistent set:

```text
authority tenant -> tenant where the app plans to operate and that contains its service principal
client_id        -> Application (client) ID of the registration
client_secret    -> Value for the credential on its owning application or exact service principal
```

For an app-registration-owned credential, query the application by client ID in the expected home tenant:

```bash
az account show --query tenantId -o tsv
az ad app show --id <application-client-id>
```

For multitenant applications, app-registration credentials remain on the publisher's application object. A customer tenant's enterprise application does not receive a copy of the publisher's secret. The target tenant must contain a service principal for the client; since March 2026, Microsoft Entra blocks non-Microsoft multitenant app-only authentication without one. The workload authenticates as the registered client while requesting access in that authorized tenant.

## Step 3: Encode the Request Correctly

The token endpoint expects `application/x-www-form-urlencoded`. Microsoft documents that `client_secret` in the token request that redeems an authorization code must be URL-encoded. The same form-encoding requirement applies when constructing client-credentials bodies.

Avoid string concatenation:

```text
client_secret=<raw value pasted into a hand-built query string>
```

Characters such as `+`, `&`, and `%` can change form parsing if left raw. A `+` in form data becomes a space. Let the form encoder handle the complete value, including any `=` characters.

Use an authentication SDK when possible. For a controlled protocol test, let the HTTP client encode each field:

```bash
read -r -s ENTRA_CLIENT_SECRET_VALUE

printf '%s' "$ENTRA_CLIENT_SECRET_VALUE" |
  curl --fail-with-body \
    --request POST \
    --url "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token" \
    --header "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "client_id=<application-client-id>" \
    --data-urlencode "scope=https://graph.microsoft.com/.default" \
    --data-urlencode "client_secret@-" \
    --data-urlencode "grant_type=client_credentials"

unset ENTRA_CLIENT_SECRET_VALUE
```

Run this test only in a secure interactive environment. A successful response contains an access token, so do not send its standard output to shared logs or publish the output.

Do not place a real secret directly on the command line, where shell history and process inspection can expose it. In this diagnostic pattern, `curl` reads the value from standard input rather than receiving the expanded secret in its argument list. A production workload should read from its approved secret provider and use a maintained identity library.

Be alert for a deployment system that base64-encodes a secret for transport but fails to decode it before use, adds a newline, strips trailing characters, expands `$` sequences, or performs URL encoding twice.

## Step 4: Check Credential Validity and Time

Inspect the credential's:

- start date/time;
- end date/time;
- key/Secret ID;
- owning application or service principal; and
- audit history.

Use UTC when comparing times. If the credential is expired, create a replacement. Do not extend a leaked or unowned credential merely to restore service.

A newly created credential should be tested only after verifying the workload actually loaded it. Repeated failures after rotation are more often stale deployment state, wrong app, wrong environment, or encoding than a need to create several more secrets.

## Step 5: Find Stale Runtime State

Secret rotation commonly updates the store but not the process that reads it. Check:

- application instances that load secrets only at startup;
- Kubernetes Secrets updated without pod restart or reload support;
- App Service deployment slots with separate settings;
- Key Vault references and refresh behavior;
- CI/CD environments with similarly named variables;
- cached configuration in a sidecar or framework;
- regional replicas missed by the rollout;
- local `.env` files overriding injected values; and
- rollback releases containing the former secret.

Expose only safe configuration metadata, for example:

```json
{
  "tenantId": "aaaabbbb-0000-cccc-1111-dddd2222eeee",
  "clientId": "00001111-aaaa-2222-bbbb-3333cccc4444",
  "credentialKeyId": "redacted-guid-safe-for-inventory",
  "configVersion": "2026-08-10.3"
}
```

Never compute and publish a reusable unsalted hash of a low-entropy secret. A credential ID and secret-store version are safer operational markers.

## Step 6: Isolate SDK Configuration from Protocol Failure

If a correctly encoded, tightly controlled token request succeeds but the application fails, inspect the SDK configuration:

- authority URL;
- tenant and client IDs;
- credential source selected by the default credential chain;
- accidental use of a certificate or federated mode;
- proxy modification;
- secret provider permissions; and
- application configuration precedence.

If both fail, compare the request metadata with the app registration and use the Entra service-principal sign-in log. Do not use production secrets in online request-testing tools.

## Rotate Without an Outage

A safe client-secret rotation uses overlap:

1. inventory current credential key IDs and owners;
2. create the new secret and store its value once;
3. deploy the new version to a small canary;
4. force a fresh token acquisition and call the intended API;
5. expand deployment and verify every instance/region;
6. monitor old-credential use if your telemetry can distinguish versions safely;
7. remove the old credential; and
8. test again after removal.

An already issued access token can remain valid until expiry or resource-enforced revocation behavior. Successful API calls immediately after rotation do not prove new token acquisitions are using the new secret. Force a new acquisition during validation.

## Prefer Credentials You Do Not Have to Copy

Microsoft's application-registration security guidance recommends managed identity when eligible. For workloads outside Azure, use workload identity federation when the platform can present a trusted OIDC token. Otherwise prefer a certificate credential over a shared secret.

Client secrets are still supported, but they create copying, storage, expiry, and rotation risks. Use them only for confidential clients that can protect them. Never embed one in a SPA, mobile app, desktop binary, or source repository.

## Fast Checklist

- [ ] Runtime `client_id` is the Application ID.
- [ ] Runtime authority targets the expected tenant.
- [ ] Secret came from the credential-owning application or exact service principal for this client ID.
- [ ] Configuration contains the secret Value, not Secret ID.
- [ ] Credential is active and unexpired.
- [ ] Raw form data is encoded once, preferably by an SDK.
- [ ] No newline, base64 wrapper, quote, or template expansion changed the value.
- [ ] Every replica loaded the new secret.
- [ ] Test forces a new token rather than using a cached access token.
- [ ] Old credential remains only for the planned overlap period.

## Official Documentation

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [passwordCredential resource type](https://learn.microsoft.com/en-us/graph/api/resources/passwordcredential)
- [Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [Retirement of service principal-less authentication](https://learn.microsoft.com/en-us/entra/identity-platform/retire-service-principal-less-authentication)
- [Microsoft identity platform and OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [OAuth 2.0 client credentials flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Security best practices for application properties](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration)
- [OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html)

## Conclusion

AADSTS7000215 is usually a credential-value, pairing, encoding, or rollout problem. Use the one-time Secret Value, never the Secret ID; confirm it belongs to the configured client and credential-owning object; target the correct authority tenant; let a library form-encode the secret; and force a new token during testing. Rotate with overlapping credentials, then move toward managed identity, federation, or certificates to eliminate shared-secret handling.
