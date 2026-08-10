# Why a New Entra Client Secret Still Fails After Rotation: Deployment, Caching, and Encoding Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, Client Secrets, Secret Rotation, MSAL, OAuth 2.0, Incident Response

Description: Troubleshoot post-rotation Entra authentication by proving the secret value, application pairing, rollout version, form encoding, and fresh token acquisition on every instance.

---

Creating a new client secret in Microsoft Entra App registrations changes only that app registration. It does not update a secret manager, restart applications, replace pipeline variables, invalidate token caches, or correct a hand-built form request.

When the new secret “still fails,” separate four systems:

```text
Entra credential record
        |
Secret distribution and deployment
        |
Runtime client configuration
        |
Token cache and target API
```

Prove each boundary rather than creating more secrets.

## Start with the Exact Failure

Common Entra codes include:

- `AADSTS7000215`: invalid client secret or authentication parameters;
- `AADSTS7000222`: supplied client-secret credentials are expired;
- `AADSTS700016`: client application not found in the selected tenant; and
- `AADSTS7000218`: required client secret or assertion is missing.

Record the numeric code, UTC timestamp, correlation/trace IDs, tenant ID, client ID, credential Secret ID/key ID, deployment version, region, and replica. Never record the secret value or raw token request body.

If the application still calls the downstream API successfully immediately after rotation, that does not prove the new secret works. It might be using an access token acquired with the old secret and retained in an application token cache.

## Check 1: Value, Not Secret ID

The portal displays credential metadata and, only when created, the secret **Value**. Microsoft Graph calls the password `secretText` and its identifier `keyId`. The secret value is returned only during the initial creation response and cannot be retrieved later.

The runtime needs:

```text
client_id     = Application (client) ID
client_secret = secret Value / secretText
```

It must not receive:

```text
client_secret = Secret ID / keyId
```

If the value was not captured, create one new credential and store it securely. Repeatedly creating secrets makes inventory and cleanup harder without solving distribution.

## Check 2: Same Application and Tenant

An app-registration client secret belongs to the application object under which it was created. Confirm:

- runtime client ID matches that app's Application ID;
- authority tenant is the app's intended tenant;
- the secret was not created under a same-named registration;
- a customer tenant's service-principal Object ID was not used as `client_id`;
- the deployment did not combine the production client ID with a staging secret; and
- the old app was not deleted and recreated with a new client ID.

Use explicit configuration names:

```text
ENTRA_TENANT_ID
ENTRA_CLIENT_ID
ENTRA_CLIENT_SECRET_VALUE
ENTRA_CREDENTIAL_KEY_ID
```

The key ID is useful nonsecret telemetry. It helps prove which credential version the deployment intends to use without exposing the password.

## Check 3: Secret-Store Version and Deployment

Updating the source secret does not guarantee every consumer has loaded it. Trace the exact path:

```text
Entra -> secret manager version -> deployment reference
      -> injected value -> process configuration -> identity SDK
```

For each hop, record a safe version identifier. Check:

- the new version is enabled and its activation time has started;
- the deployment references the expected secret name and version/stage;
- staging and production use separate stores and identities;
- application instances that read configuration only at startup were restarted or reloaded;
- all regions, slots, nodes, jobs, and workers received the rollout;
- a rollback did not restore an old value;
- local development configuration is not overriding injected settings; and
- the process identity can read the secret manager.

An intermittent failure often means mixed replicas. Add deployment/instance fields to authentication error telemetry and compare their intended credential key IDs.

Do not log even a partial secret as a fingerprint. Use the Entra key ID and secret-manager version.

## Check 4: Encoding and Transformation

The token endpoint consumes `application/x-www-form-urlencoded` data. A secret must be encoded as a form value. Hand-built strings can change characters:

- `+` can be interpreted as a space;
- `&` can start another field;
- `%` can begin an escape sequence;
- a newline can be appended by file or command handling;
- quotes can become part of the value;
- base64 transport can remain undecoded; or
- an already encoded value can be encoded again.

Use MSAL or another maintained identity library. For an isolated protocol check, let the HTTP client encode fields:

```bash
read -r -s ENTRA_ROTATION_SECRET_VALUE

printf '%s' "$ENTRA_ROTATION_SECRET_VALUE" | \
  curl --fail-with-body \
    --request POST \
    --url "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token" \
    --header "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "client_id=<application-client-id>" \
    --data-urlencode "scope=https://graph.microsoft.com/.default" \
    --data-urlencode "client_secret@-" \
    --data-urlencode "grant_type=client_credentials"

unset ENTRA_ROTATION_SECRET_VALUE
```

Here, curl reads the secret value from standard input instead of receiving it as a command-line argument. Avoid placing a real secret in shell history, environment exports, or process arguments. Perform the test only in an approved environment and discard the output securely.

If this request succeeds while the application fails, focus on the SDK's credential source, authority, proxy, and configuration precedence.

## Check 5: Force a New Token

MSAL confidential clients cache app-only access tokens in an application token cache. The cache is good for reliability, but it can hide both success and failure during rotation:

- an old cached access token can make a workload appear healthy even though new authentication would fail;
- different replicas can hold tokens acquired with different credentials;
- an API call can fail for authorization/audience reasons unrelated to secret validation; and
- a test that repeatedly returns the same token never exercises the new secret.

Use a controlled canary with an isolated, empty application token cache or a supported force-refresh technique. Then call the intended API and verify:

- token endpoint succeeded;
- the request targeted the intended resource's `/.default` scope;
- the expected application permission, app-role assignment, or resource ACL authorization is configured; and
- API request succeeds.

Never delete the production token cache indiscriminately during an incident. Isolate the test so it does not create a thundering herd at Entra.

## Check 6: Credential Validity Window

Compare the secret's start and end timestamps in UTC. A credential can fail because:

- its start time has not arrived;
- it expired;
- it was deleted during an overlapping deployment;
- administrators rotated a different app registration.

Do not assume an arbitrary “propagation delay” is the cause before proving the tenant, client ID, key ID, and runtime version. Retry with bounded backoff for transient transport/service failures, but an invalid-secret response is not fixed by an endless retry loop.

## A Zero-Downtime Rotation Runbook

### Prepare

1. Inventory existing credential key IDs, expiry, owners, and consumers.
2. Confirm the app registration, tenant, permissions, and current healthy baseline.
3. Ensure monitoring distinguishes token acquisition from cached API calls.

### Add

4. Create one new credential with the approved lifetime.
5. Store the Value immediately in the protected secret manager.
6. Record only its key ID and secret-store version in the change ticket.
7. Keep the old credential active.

### Deploy

8. Update a canary instance to the new secret version.
9. Force a fresh token acquisition and call the intended resource.
10. Expand to every environment instance and verify rollout telemetry.
11. Observe for at least the longest relevant restart/job schedule and token-cache behavior.

### Retire

12. Remove the old credential from Entra.
13. Force another fresh acquisition on a canary.
14. Remove the old value/version from distribution systems according to retention policy.
15. Close the change only when every consumer has an owner and current key ID.

Do not remove the old secret immediately after updating the store. Overlap is what makes rotation safe.

## If the Old Secret Was Exposed

An incident changes priorities. Reduce the overlap window, remove the credential, disable or restrict the service principal if necessary, review service-principal sign-ins, examine downstream resource activity, and rotate any dependent credentials.

Assume a copied client secret can be replayed until removed or expired. Access tokens already issued can remain valid according to their lifetime and resource revocation behavior. Coordinate containment with owners of the resources the app can access.

## Stop Repeating Secret Rotation

After restoring service, eliminate the failure class where possible:

- use managed identity for eligible Azure-hosted workloads;
- use workload identity federation for GitHub Actions, Kubernetes, or another trusted external OIDC platform;
- use a protected certificate/private key if federation is unavailable; and
- retain client secrets only as time-bounded exceptions.

Microsoft's app-registration security guidance strongly prefers managed identity and recommends certificates when secure identity federation is not possible.

## Fast Diagnosis Table

| Observation | Most likely area |
| --- | --- |
| Raw encoded test succeeds, app fails | Runtime configuration or SDK credential source |
| One region fails | Partial deployment or stale process |
| API works until token expires | Fresh acquisition with the new credential/configuration fails while a prior token is cached |
| AADSTS700016 | Client ID/tenant/service principal, not rotation value |
| AADSTS7000215 after copy | Value vs Secret ID, pairing, or encoding |
| AADSTS7000222 | Expired credential still being sent |
| New and old both fail | Wrong app/tenant or request construction |
| New works, old still works after planned removal | Old credential not deleted from the correct registration or cached token |

## Official Documentation

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [passwordCredential resource type](https://learn.microsoft.com/en-us/graph/api/resources/passwordcredential)
- [Microsoft identity platform and the OAuth 2.0 client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Acquire tokens to call a web API using a daemon application](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-acquire-token)
- [Security best practices for application properties](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration)
- [OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html)

## Conclusion

A new client secret works only after the correct Value reaches the correct client in the correct tenant, survives transport encoding, loads into every process, and is exercised by a fresh token request. Trace the credential by key ID and deployment version, rotate with overlap, and distinguish cached API success from new authentication. Then migrate to managed identity, federation, or certificates so routine operations no longer depend on copied passwords.
