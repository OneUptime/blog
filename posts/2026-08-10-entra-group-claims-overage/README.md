# Why Entra Group Claims Disappear and How to Handle Overage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, Group Claims, Token Claims, Microsoft Graph, Authorization, JWT

Description: Detect Entra group-claim overage safely, retrieve membership through Microsoft Graph, reduce token size, and avoid treating a missing groups array as no access.

---

Microsoft Entra ID limits how many group memberships it emits in a token. Microsoft currently documents limits of **200 groups for JWTs** and **150 groups for SAML assertions**, including nested group memberships. In the OAuth implicit flow, the practical token limit is only five groups.

When a user exceeds the applicable limit, Entra does not send a partial `groups` array. It omits the normal group list and provides an overage indication. An application that interprets “no `groups` claim” as “the user belongs to no groups” will deny legitimate access-or, in poorly designed negative-policy logic, accidentally grant it.

## What Overage Looks Like

For a JWT, a normal token can contain:

```json
{
  "oid": "user-object-id",
  "groups": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ]
}
```

When overage occurs, the direct array is absent. Depending on the token flow and version, the token contains an overage marker such as a `groups` entry in `_claim_names` with a corresponding source, or `hasgroups` in the implicit-flow case.

The important contract is:

```text
groups array present -> evaluate the emitted group IDs
overage marker present -> retrieve authoritative membership
neither present       -> do not invent membership; follow the app's claim contract
```

Do not follow an endpoint from a token blindly. Microsoft's current claims guidance warns applications not to depend on the URL included in older overage metadata. Construct the supported Microsoft Graph query from the validated identity type and object ID.

## Why Entra Uses a Limit

Group membership can be extremely large, especially with nested groups. Emitting every ID would increase:

- browser header and cookie sizes;
- proxy and web-server rejection risk;
- token issuance and parsing cost;
- disclosure of directory structure; and
- authorization latency on every request.

The limit is a token-size safety boundary, not evidence that group membership stopped working.

The count includes memberships that the selected group-claim configuration emits. A user can cross the limit after being added to an unrelated nested group, making a previously present claim seem to “disappear” without any change to the application.

## Handle Overage as an Explicit State

The authorization path should distinguish at least three states:

```text
DIRECT    - complete groups list is in the validated token
OVERAGE   - token says the list is not present; Graph lookup is required
UNKNOWN   - required claim contract is missing or unsupported
```

Fail closed for privileged operations when membership cannot be determined. Return a diagnosable authorization or dependency error rather than silently treating Graph failure as “not a member” in one place and “allow” in another.

Pseudocode:

```text
validate issuer, audience, signature, time, and token type

if token has a supported groups array:
    memberships = validated group IDs
else if token has a supported group-overage indicator:
    memberships = query Graph using the validated tenant and subject/object ID
else:
    memberships = empty only if the application's token contract defines that meaning

authorize against immutable group IDs or mapped application roles
```

Do not perform the Graph lookup before validating the token. Otherwise an attacker can choose arbitrary tenant and user identifiers for your backend to query.

## Retrieve Membership with Microsoft Graph

Choose the Graph operation according to the application's identity context and authorization needs. Microsoft Graph provides operations such as `getMemberObjects` and transitive membership queries. A delegated application can query for the signed-in user with appropriately granted Graph permissions; a daemon uses application permissions and a concrete user Object ID.

Keep the lookup tenant-bound:

1. validate the Entra issuer and `tid` against an allowed tenant model;
2. take the user `oid` from the validated token;
3. call Microsoft Graph for that tenant using a Graph access token;
4. request only the membership data required;
5. compare immutable group Object IDs; and
6. apply a short, policy-aware cache.

The access token for your own API cannot be forwarded to Microsoft Graph because its audience is your API. Acquire a separate Graph token. If a web API needs to preserve the user's delegated context, use the on-behalf-of flow. If the architecture intentionally uses app-only directory access, grant the smallest viable Graph application permission and audit it as a privileged workload.

Do not automatically grant `Directory.Read.All` just to solve overage. Review the exact Microsoft Graph operation and its least-privileged permissions.

## Reduce the Chance of Overage

### Emit Only Groups Assigned to the Application

For many enterprise applications, only a few groups influence authorization. Configure the group claim to emit groups assigned to the application instead of every security group.

This changes semantics. Test direct versus nested membership and assignment behavior for your application. Do not assume that every transitive group will still appear.

### Use a Group Filter

Entra group-claim configuration can filter groups by supported attributes and operations. Microsoft documents that group filtering applies only when a user belongs to 1,000 or fewer groups; above that threshold, filtering is not applied and overage is sent.

Filters are therefore a token-shaping tool, not an unlimited membership engine.

### Use App Roles

For new applications, Microsoft recommends app roles rather than raw groups when nested-group support is not required. Administrators can assign tenant groups to stable application roles such as `Billing.Reader` or `Incident.Admin`. Tokens carry a compact `roles` claim, while the application's authorization vocabulary remains portable across tenants.

This is often the best design for SaaS. Customer group IDs differ, but app-role values remain defined by the application.

### Use an Application Authorization Store

Complex rules involving resource ownership, attributes, time, separation of duties, or external organizations might not fit group claims. Map a validated Entra subject to an application-managed policy rather than forcing the directory to emit the entire authorization state.

## Do Not Use Group Display Names as Security Keys

Group Object IDs are immutable identifiers within a tenant. Display names are not unique and can change. Microsoft allows some group-name emission for migration scenarios, but name-based authorization creates collision and rename risks.

If a multitenant application consumes group IDs, scope every mapping by tenant:

```text
(tenant ID, group Object ID) -> application role/policy
```

A group GUID from one tenant must never authorize a subject from another simply because an unscoped cache entry matches.

## Cache Carefully

Graph lookup on every request increases latency and availability coupling. A cache can help, but group membership is authorization data:

- use a short TTL proportional to revocation requirements;
- key by tenant, user Object ID, and policy/version;
- never cache raw access tokens as membership records;
- invalidate on known lifecycle events where available;
- fail closed for high-risk actions when freshness cannot be established; and
- measure Graph throttling and lookup failures.

If immediate revocation is a hard requirement, token-carried groups are already insufficient because access tokens have lifetimes. Design a resource-side session or policy check with the required revocation behavior.

## Test the Boundary

Create test users or controlled fixtures for:

- zero relevant groups;
- one relevant group;
- just below the JWT/SAML limit;
- just above the limit;
- nested groups;
- more than five groups through any legacy implicit-flow path;
- more than 1,000 groups when filtering is configured;
- Graph throttling or outage;
- membership removal while a token/cache entry is active; and
- users from two allowed tenants with different group mappings.

Verify that overage retrieves the same authorization result as direct emission. Test denial behavior when Graph cannot be reached.

## Common Mistakes

### Treating missing `groups` as empty

Check the supported overage marker first.

### Parsing an ID token at an API

The API should validate an access token intended for it. Claims can differ by token type and resource.

### Calling the overage URL from the token

Use current Microsoft Graph guidance and build an allowed request after token validation. Do not turn claim content into an arbitrary outbound URL.

### Returning the Graph token to the browser

Keep backend directory permissions and tokens server-side. Return only the application's authorization result.

### Emitting groups as roles and expecting app roles too

Microsoft notes that if group data is configured to be emitted as role claims, only groups appear in the role claim; application-role assignments do not also appear there. Choose one contract deliberately.

## Official Documentation

- [Configure group claims for applications by using Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [Add app roles to your application and receive them in the token](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps)
- [Microsoft Graph getMemberObjects](https://learn.microsoft.com/en-us/graph/api/directoryobject-getmemberobjects)
- [Microsoft identity platform and OAuth 2.0 on-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)

## Conclusion

Entra group claims disappear when membership exceeds a token limit because Entra sends an overage indicator instead of a partial list. Detect that state explicitly, validate the token, and retrieve authoritative membership through a tenant-bound Microsoft Graph call. Reduce token pressure with assigned groups, supported filters, or preferably stable app roles, and never treat a missing groups array as proof of no membership.
