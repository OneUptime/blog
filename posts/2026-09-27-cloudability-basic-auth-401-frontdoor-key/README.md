# How to Fix Cloudability Basic Auth 401 Errors Caused by a Frontdoor API Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, Authentication, FinOps, Troubleshooting

Description: Resolve Cloudability API 401 responses by distinguishing product API keys from Frontdoor key pairs and testing the documented authentication flow for each.

A Frontdoor public key is not a Cloudability product API key. Both may be called API keys in conversation, but they participate in different authentication flows. Passing a Frontdoor key as the Basic Auth username can therefore fail even when the key itself is valid.

Identify how the credential was created before rotating it or changing account permissions. Then test a small read-only endpoint with the corresponding authentication method.

## Recognize the two flows

For supported commercial Cloudability endpoints, the product API key is used as the Basic Auth username with an empty password. Frontdoor instead issues a public/private key pair that is exchanged for an OpenToken; the token is then supplied with the target environment context.

Use the current endpoint documentation as the authority, because some newer API families describe other token requirements. The examples here target standard V3 reporting collection access, not every product endpoint or GovCloud authentication policy.

Record the tenant region, intended environment, key owner, credential type, and endpoint. These facts can be logged without logging the secret values.

## Test a product API key

The following Python example requires `requests` and a product key supplied securely through the environment. It uses the US regional host; use the documented host for your tenant.

```python
import os
import requests

response = requests.get(
    "https://api.cloudability.com/v3/reporting/reports/cost",
    auth=(os.environ["CLOUDABILITY_API_KEY"], ""),
    headers={"Accept": "application/json"},
    timeout=(10, 60),
)
print("HTTP status:", response.status_code)
response.raise_for_status()
```

The library constructs the Basic header. Do not pre-encode the key before passing it to `auth`. If constructing the header manually, the encoded input includes the colon separating the username from the empty password.

A successful response with few reports may reflect the user's access scope. That is different from authentication failure.

## Exchange a Frontdoor key pair

IBM's authentication guidance uses the region-specific `/service/apikeylogin` endpoint with `keyAccess` and `keySecret`. Obtain the resulting `apptio-opentoken` from the response header, then use it with `apptio-environmentid` for the documented Cloudability flow.

```python
import os
import requests

login = requests.post(
    "https://frontdoor.apptio.com/service/apikeylogin",
    headers={"Accept": "application/json"},
    json={
        "keyAccess": os.environ["FRONTDOOR_KEY_ACCESS"],
        "keySecret": os.environ["FRONTDOOR_KEY_SECRET"],
    },
    timeout=(10, 60),
)
login.raise_for_status()
token = login.headers.get("apptio-opentoken")
if not token:
    raise RuntimeError("Expected OpenToken response header is absent")
response = requests.get(
    "https://api.cloudability.com/v3/reporting/reports/cost",
    headers={
        "apptio-opentoken": token,
        "apptio-environmentid": os.environ["CLOUDABILITY_ENVIRONMENT_ID"],
        "Accept": "application/json",
    },
    timeout=(10, 60),
)
print("HTTP status:", response.status_code)
response.raise_for_status()
```

This example shows the US Frontdoor and Cloudability hosts together. Select the appropriate pair for your region. Verify that the key has been granted access to the intended environment and role.

Do not print the login response headers: they contain the newly issued credential. Persist secrets only through the approved secret-management mechanism if persistence is necessary.

## Diagnose the stage that failed

If Frontdoor login fails, examine the key pair, region, retention or expiry policy, and account configuration. If login succeeds but the Cloudability request fails, examine the environment identifier, environment grant, endpoint authentication contract, and token validity.

For a product key, check that API access is enabled for its owner and that the value has not been truncated, wrapped in literal quotes, or replaced by an old rotated key. Avoid logging the value while checking these conditions.

Also inspect proxies and redirect behavior. Start with the exact documented HTTPS API host rather than a browser application URL. Do not respond to a TLS or authentication failure by disabling certificate verification or forwarding credentials to an unrelated redirected host.

## Make the correction durable

Name secret variables by credential type, as the examples do. Store the target region and environment as explicit configuration. A vague variable such as `API_KEY` makes it easier to substitute a different vendor or identity-system key later.

Retain a read-only smoke check for deployment and rotate compromised credentials through the normal process. Avoid an infinite retry loop on 401 responses; retries do not convert one credential type into another.

## Conclusion

Match the credential to its documented authentication flow. Product-key Basic Auth and Frontdoor token exchange are separate paths, and testing them separately makes a persistent 401 much easier to resolve.

## Official Documentation

- [IBM Cloudability V3 authentication](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3)
- [IBM Frontdoor key and OpenToken procedure](https://www.ibm.com/support/pages/generating-frontdoor-api-keys-public-private-and-opentoken-secure-access-cloudability-apis)
- [IBM reporting collection authentication example](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
