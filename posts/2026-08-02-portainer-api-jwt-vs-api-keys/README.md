# Portainer API Authentication: JWT Tokens vs. API Keys for Scripts and CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Authentication, JWT, API Key, CI/CD, Security

Description: Compare Portainer JWT authentication with API access tokens, use the correct headers, and choose a safer credential pattern for scripts and CI pipelines.

---

Portainer supports two authentication patterns that are easy to confuse because both ultimately authorize requests as a Portainer user:

- Authenticate with an internal or configured LDAP username and password at `POST /api/auth`, receive a short-lived JWT, and send it as an HTTP bearer token. Ordinary OAuth users authenticate through Portainer's OAuth flow instead.
- Create an API access token for a user and send it directly in the `X-API-Key` header.

The headers are not interchangeable. A valid Portainer API key in `Authorization: Bearer ...` will fail, as will a JWT placed in `X-API-Key`.

## The Practical Difference

| Question | JWT from `/api/auth` | API access token |
| --- | --- | --- |
| Initial secret | Internal or configured LDAP username and password | Token generated for a Portainer user |
| Request header | `Authorization: Bearer <jwt>` | `X-API-Key: <token>` |
| Lifetime | Eight hours by default; Portainer's user-session timeout is configurable | Used directly until it is removed or otherwise invalidated |
| Best fit | Interactive tools and short sessions that can authenticate again | Scripts, scheduled jobs, and CI secret stores |
| Permissions | Permissions of the authenticated user | Permissions of the user that created the token |
| Revocation approach | Let it expire; changing server-side state can also invalidate sessions | Remove the named token from the user's account |

An API token is not a way around Portainer authorization. If its user can access only one environment, API calls made with that token have the same restriction. Likewise, an administrator's token has administrator privileges. The user behind the credential is therefore the real security boundary.

## Option 1: Authenticate and Use a JWT

Send JSON credentials to the authentication endpoint:

```bash
PORTAINER_URL='https://portainer.example.com'
PORTAINER_USERNAME='automation-user'

read -r -s -p 'Portainer password: ' PORTAINER_PASSWORD
printf '\n'

JWT="$({
  jq -n \
    --arg username "$PORTAINER_USERNAME" \
    --arg password "$PORTAINER_PASSWORD" \
    '{Username: $username, Password: $password}' |
    curl --fail-with-body --silent --show-error \
      --request POST \
      --header 'Content-Type: application/json' \
      --data-binary @- \
      "$PORTAINER_URL/api/auth"
} | jq -r '.jwt')"

test -n "$JWT" && test "$JWT" != 'null'
```

Then pass that JWT as a bearer token:

```bash
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $JWT" \
  "$PORTAINER_URL/api/endpoints"
```

Portainer's API examples document the default JWT lifetime as eight hours, although an administrator can change the user-session timeout. A process that runs longer than the configured lifetime must authenticate again after expiry. Do not decode the token's payload and treat that as signature validation; the Portainer server decides whether a presented token is valid.

### When JWT Authentication Is Useful

JWT authentication is reasonable when:

- a human starts a short-lived administration script;
- an interactive client already collects a username and password;
- you deliberately want the credential obtained by the client to expire within the documented session window; or
- an existing integration is built around Portainer's login flow.

It is less attractive for unattended CI because the job must store a reusable user password, submit it to `/api/auth`, parse a second secret, and handle expiry.

## Option 2: Use an API Access Token

In Portainer, sign in as the intended user, open **My account**, find **Access tokens**, and add a token with a recognizable description such as `production-deploy-github-actions`. Portainer displays the new value once, so copy it directly into an approved secret manager.

Use it with `X-API-Key`:

```bash
PORTAINER_URL='https://portainer.example.com'
: "${PORTAINER_API_KEY:?Set PORTAINER_API_KEY in the secret store}"

curl --fail-with-body --silent --show-error \
  --header "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/api/endpoints"
```

There is no login request in this flow. This makes the API token a better operational credential for CI, but it also means the raw value must be protected for as long as the integration uses it. Remove the token in the user's account when the job is retired or the credential may have leaked.

## A Safer CI Design

Do not generate a token under the default administrator merely because it is convenient. Instead:

1. Create a dedicated Portainer user for the automation.
2. Give it access only to the environments and resources the job must manage.
3. Sign in as that user and generate a descriptively named access token.
4. Store the token as a masked CI secret, not in the repository, Compose file, workflow YAML, or command-line history.
5. Expose the secret only to protected branches, environments, or deployment jobs.
6. Rotate it by creating a replacement, updating the CI secret, testing it, and then removing the old token.

A minimal GitHub Actions step, for example, can pass the secret through the environment rather than interpolate it into the workflow's command text:

```yaml
- name: Read Portainer environments
  shell: bash
  env:
    PORTAINER_URL: https://portainer.example.com
    PORTAINER_API_KEY: ${{ secrets.PORTAINER_API_KEY }}
  run: |
    set -euo pipefail
    curl --fail-with-body --silent --show-error \
      --header "X-API-Key: $PORTAINER_API_KEY" \
      "$PORTAINER_URL/api/endpoints" \
      > endpoints.json
```

Be careful with shell tracing. `set -x`, verbose HTTP output, copied error commands, and debug artifacts can all expose request headers even when a CI platform normally masks the exact secret value.

## Do Not Disable TLS Verification to Make CI Pass

Portainer's documented server port for the UI and API is HTTPS `9443` by default, although a reverse proxy commonly presents the service on standard port `443`. The client must trust the certificate chain for the hostname it calls.

Avoid normalizing this pattern:

```bash
# Avoid: it hides certificate and man-in-the-middle failures.
curl --insecure ...
```

Install the organization's CA certificate in the runner trust store or use a publicly trusted certificate. Authentication protects access to the API; TLS protects the credential while it crosses the network.

## Diagnose Authentication Failures by Status and Endpoint

Start with a harmless endpoint the user should be able to read:

```bash
curl --silent --show-error \
  --dump-header /tmp/portainer-headers \
  --output /tmp/portainer-body \
  --write-out 'HTTP %{http_code}\n' \
  --header "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/api/endpoints"
```

Interpret failures in context:

- **401 Unauthorized:** check the header name, missing or truncated secret, expired JWT, removed API token, and whether a proxy stripped `Authorization` or `X-API-Key`.
- **403 Forbidden:** the credential may be valid but its user lacks access to that operation or environment.
- **404 Not Found:** confirm that the URL includes Portainer's `/api` prefix and that a reverse-proxy subpath is handled consistently. A 404 is not normally repaired by changing credentials.
- **HTML instead of JSON:** the request may have reached a proxy login page, the Portainer UI route, or another virtual host.

Use Portainer's current API documentation for your installed edition and release. Authentication can succeed while an endpoint or request schema has changed between releases.

## Avoid These Common Mistakes

### Sending Both Credential Types

Pick one authentication header per request. Current Portainer releases reject authenticated requests that contain both `Authorization` and `X-API-Key`.

### Calling `/api/auth` with an API Key

`/api/auth` accepts credentials to create a JWT. An API access token is already a credential for API calls and does not need to be exchanged there.

### Treating a Token Description as the Secret

The description helps humans identify a token in **My account**. It is not the token value. Because the raw token is shown only when created, generate a replacement if it was not recorded securely.

### Giving CI an Administrator Credential

Portainer's API can act as a gateway to an environment's Docker or Kubernetes API. An over-privileged Portainer credential can therefore have consequences well beyond reading the Portainer configuration. Use a dedicated identity and least privilege.

## Recommendation

Use a named API access token in `X-API-Key` for most unattended scripts and CI jobs. It avoids storing the user's login password and avoids the configured JWT renewal flow. Use a JWT for short, user-driven sessions where authenticating with a password and receiving an expiring credential is the desired behavior.

Whichever method you choose, permissions come from the Portainer user. Credential selection does not replace account scoping, HTTPS, secure secret storage, rotation, and audit-friendly token naming.

## Official Documentation

- [Portainer: Accessing the Portainer API](https://docs.portainer.io/api/access)
- [Portainer: API usage examples](https://docs.portainer.io/api/examples)
- [Portainer: Current API documentation](https://docs.portainer.io/api/docs)
- [Portainer: Account settings and access tokens](https://docs.portainer.io/user/account-settings)
- [Portainer: Requirements, prerequisites, and network ports](https://docs.portainer.io/start/requirements-and-prerequisites)
