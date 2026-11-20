# Rotate Cloud Application Secrets with an Overlap Window

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Security, Azure, Cloud Automation

Description: Rotate an application credential through overlapping versions, fresh-token canaries, consumer rollout, and evidence-based retirement of the old secret.

Replacing a secret in a vault is not the same as rotating an application's credential. The identity provider must accept the replacement, consumers must load it, and their next authentication attempt must work. A healthy service can hide a broken rotation while its cached access tokens remain valid.

An overlap window lets the old and new credentials coexist while consumers move. It can support rotation without authentication downtime, but only when the provider permits overlapping credentials and the application can reload or restart safely. Verify those conditions before promising uninterrupted service.

This guide uses a Microsoft Entra application registration and Microsoft Graph v1.0 as a concrete example. Other providers have different credential limits and replacement semantics. Do not apply the sequence to an API that immediately invalidates the previous credential when generating a new one.

## Track three identities separately

Keep a rotation record with the application identity, the identity-provider credential identifier, and the secret-store version reference. These are different identifiers with different jobs.

| Identifier | Purpose |
|---|---|
| Application object ID | Selects the application object for management operations |
| Application client ID | Identifies the client in token requests |
| Password credential `keyId` | Selects the exact credential to retire |
| Secret-store version reference | Selects the value a consumer loads |

Never use the secret value as an inventory identifier or log field. Record nonsecret references and an owner for every consumer: services, scheduled jobs, CI pipelines, disaster-recovery deployments, and infrequently used administrative tools.

Key Vault stores secret values; it does not know whether a value still authenticates against another service. A new vault version does not independently create or revoke an Entra credential. [Key Vault secret semantics](https://learn.microsoft.com/en-us/azure/key-vault/secrets/about-secrets).

## Create the replacement without retiring the original

Microsoft Graph exposes an `addPassword` operation on the application. The following is a request-shape example for an authorized credential-management client, not a shell command to paste with a real token. Replace the object ID and choose an expiry consistent with your policy.

```http
POST https://graph.microsoft.com/v1.0/applications/REPLACE-OBJECT-ID/addPassword
Authorization: Bearer REPLACE-MANAGEMENT-TOKEN
Content-Type: application/json

{
  "passwordCredential": {
    "displayName": "rotation-2026-11-20",
    "endDateTime": "2027-02-18T00:00:00Z"
  }
}
```

The response includes `keyId` and `secretText`. Save the identifier in the rotation record and write the secret directly to the protected secret store. The secret text cannot be retrieved later. Do not send the response through ordinary CI output or a general-purpose request logger. Scope the management identity's permissions to the documented operation and intended application ownership. [Graph addPassword API](https://learn.microsoft.com/en-us/graph/api/application-addpassword?view=graph-rest-1.0).

Retain the old credential during preparation. If secure storage of the new value fails, treat that as an incomplete rotation: reconcile the new credential's identifier and clean up deliberately. Do not repeatedly create credentials without tracking which ones now exist.

```mermaid
flowchart LR
    A[Old credential active] --> B[Add and store replacement]
    B --> C[Fresh-token canary with replacement]
    C --> D[Roll consumers to new version]
    D --> E[Verify every consumer]
    E --> F[Retire exact old credential]
    F --> G[Verify new authentication again]
```

## Prove the new credential can authenticate

A request served using an existing access token does not prove the replacement secret works. Run a fresh token acquisition using only the new credential, then verify a harmless authorized operation against the application's real destination.

The Python 3.11 probe below is for an application that uses Microsoft Graph in the public Azure cloud. It requests a new token directly, without an application token cache. It intentionally withholds the token and error-response body. Adapt the resource scope and cloud endpoint only after checking that environment's documentation.

Save it as `probe.py`:

```python
import getpass
import json
import os
import urllib.parse
import urllib.request
import uuid
import warnings


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError('Unexpected redirect')


def probe(tenant, client, secret):
    tenant = str(uuid.UUID(tenant))
    client = str(uuid.UUID(client))
    if not secret:
        raise ValueError('Empty credential')
    body = urllib.parse.urlencode({
        'client_id': client,
        'client_secret': secret,
        'scope': 'https://graph.microsoft.com/.default',
        'grant_type': 'client_credentials',
    }).encode('ascii')
    request = urllib.request.Request(
        f'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
        data=body,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        method='POST',
    )
    opener = urllib.request.build_opener(NoRedirect())
    with opener.open(request, timeout=20) as response:
        result = json.load(response)
    if not isinstance(result.get('access_token'), str) or not result['access_token']:
        raise ValueError('Missing token')
    if str(result.get('token_type', '')).lower() != 'bearer':
        raise ValueError('Unexpected token type')
    return True


if __name__ == '__main__':
    try:
        warnings.simplefilter('error', getpass.GetPassWarning)
        secret = getpass.getpass('Replacement client secret: ')
        probe(os.environ['TENANT_ID'], os.environ['CLIENT_ID'], secret)
    except Exception:
        raise SystemExit('Fresh-token probe failed; response details withheld.')
    print('Replacement credential acquired a fresh token; token withheld.')
```

Set `TENANT_ID` and `CLIENT_ID` to the real nonsecret GUIDs, then run `python3 probe.py` in a private interactive terminal. Enter the replacement secret at the hidden prompt. Do not pass it on the command line or enable HTTP debug logging.

The expected message confirms fresh token acquisition, not Graph authorization or end-to-end application health. The probe discards the token rather than printing it. Your separate application canary must exercise a preapproved read operation using the new secret. Do not add broad Graph permissions merely to make this test pass.

The request uses the documented client-credentials grant and URL-encodes the secret, including characters such as `+` and `&`. This flow uses application permissions rather than a signed-in user's permissions. [Microsoft identity platform client-credentials protocol](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow).

Python's [getpass](https://docs.python.org/3.11/library/getpass.html) can warn when it cannot suppress terminal echo; this example turns that warning into a failure. Its [HTTP handler](https://docs.python.org/3.11/library/urllib.request.html) rejects redirects instead of forwarding a credential-bearing request elsewhere. Normal TLS certificate verification remains enabled. This is a diagnostic probe, not a replacement for a maintained authentication library in the application.

## Move consumers deliberately

Promote a specific secret-store version or deployment reference, and record which consumer revision loaded it. A “latest” reference is convenient only if you understand when each consumer resolves and caches it. A process that reads configuration once at startup will not necessarily notice a vault update.

Roll out to one service instance or a small worker group first. Verify fresh authentication and the real read-only canary. Then expand while watching token acquisition failures, application authorization failures, queue backlog, and the loaded credential-version identifier. Never log the credential itself.

Do not let silent fallback to the old credential make a failed new deployment look healthy. If fallback is necessary for availability, record it as a failed rotation gate and keep the old credential active until the cause is resolved. Success means the new credential works independently.

Long-lived access tokens deserve special attention. Their lifetime is separate from the secret's lifetime, so ordinary traffic may remain healthy after a bad secret rollout. Measure a fresh authentication path rather than assuming that a fixed waiting period exposes every dormant consumer. [Access-token behavior](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens).

## Retire only the credential you intended

Before retirement, require evidence that every inventoried consumer has switched, fresh-token checks succeed, and the rollback window is intentionally closing. Include disaster-recovery and scheduled workloads, even if they have not naturally run during the overlap period.

Graph's removal operation identifies one password credential by its `keyId`:

```http
POST https://graph.microsoft.com/v1.0/applications/REPLACE-OBJECT-ID/removePassword
Authorization: Bearer REPLACE-MANAGEMENT-TOKEN
Content-Type: application/json

{
  "keyId": "REPLACE-OLD-CREDENTIAL-GUID"
}
```

This is a revocation action. Compare the selected identifier against the original rotation record and the replacement identifier before sending it. A successful request returns HTTP 204. [Graph removePassword API](https://learn.microsoft.com/en-us/graph/api/application-removepassword?view=graph-rest-1.0).

After retirement, repeat fresh authentication with the new credential. Check that the old credential can no longer obtain a new token through a controlled test, without printing either value. Do not interpret revocation as an instruction to destroy the audit record, nor assume it instantly invalidates every previously issued token.

If the new rollout fails before retirement, roll consumers back to the still-valid old reference and investigate. After retirement, the old vault value is not a working rollback mechanism; recovery requires another valid credential or a separately prepared authentication path.

## Make the evidence honest

Nine local tests for the probe covered encoded request fields, valid and malformed token responses, invalid identifiers, an empty secret, and redirect rejection. They used fake responses and made no network calls. No application credential was created or removed for this article.

The production acceptance test is broader: successful authentication by the new credential, a harmless authorized operation, confirmed consumer rollout, precise retirement, and another fresh authentication check. Keep that evidence alongside the rotation record. Where supported, plan a later move to managed identity or workload federation so the application no longer needs this shared-secret lifecycle.
