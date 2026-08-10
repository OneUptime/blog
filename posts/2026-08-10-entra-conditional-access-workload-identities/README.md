# Why Standard Conditional Access Does Not Protect Client-Credential Sign-Ins—and What Workload Identity Policies Cover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, Conditional Access, Workload Identities, Service Principals, Client Credentials, Zero Trust

Description: Protect eligible service-principal token requests with Entra Conditional Access for workload identities while accounting for licensing, identity, policy, and CAE limitations.

---

Conditional Access policies scoped to **users** do not protect a service principal signing in with client credentials. No user is present to satisfy MFA, device compliance, sign-in risk, or other user conditions. Microsoft explicitly warns that calls made by service principals are not blocked by policies scoped to users.

Microsoft Entra provides **Conditional Access for workload identities** for a narrower set of service-principal scenarios. As of 2026, it can block eligible service principals by location, service-principal risk, and supported authentication-context combinations. It does not turn a workload into a user, and it does not cover every application identity.

## Why User Conditional Access Is Bypassed

A delegated authorization-code flow has a user and a client:

```text
user + client -> authorization endpoint -> delegated token
```

Policies targeting that user can evaluate applicable signals.

Client credentials has only a workload identity:

```text
service principal + credential -> token endpoint -> app-only token
```

The admin who created the app, the owner of the service principal, and the pipeline operator are not token subjects. Their MFA or compliant device does not become part of a later daemon authentication.

This is also why adding a service principal's owners to a strict user Conditional Access group does not protect the service principal. Ownership governs administration, not runtime authentication.

## What Workload Identity Conditional Access Covers

Microsoft's current workload policy supports service principals for line-of-business applications under specific constraints:

- the service principal must be single-tenant and registered in the tenant;
- it must be selected directly as a workload identity in the policy;
- policies can block requests outside allowed named/public IP locations;
- policies can block based on detected service-principal risk;
- supported authentication-context scenarios can participate; and
- **Block access** is the available grant control.

The policy is evaluated when the service principal requests a token. It cannot require the workload to perform MFA.

A common location policy is:

```text
Identity:        selected production deployment service principal
Target resource: all resources
Location:        include any location
Exclusion:       approved public egress ranges
Grant:           block access
State:           report-only, then enabled
```

“All resources” matters because the protection is attached to the calling service principal's token request rather than one administrator's interactive session.

## Licensing Caveat

Microsoft Entra **Workload Identities Premium** licenses are required to create or modify Conditional Access policies scoped to service principals. Microsoft states that existing workload-identity policies continue to function in a directory that loses the appropriate license, but they cannot be modified.

Do not assume an Entra ID P1/P2 user license alone grants this workload feature. Review the current Workload ID licensing terms and license each workload identity as required before rollout.

Service-principal risk uses Microsoft Entra workload risk capabilities. Include licensing and data-availability checks in the design rather than discovering them when the risk condition is unavailable.

## Important Exclusions

Microsoft currently documents these exclusions:

- **managed identities are not covered** by Conditional Access for workload identities;
- **third-party SaaS and multitenant applications are not covered**;
- Microsoft applications are not covered by these service-principal policies; and
- a service principal inside a group does not receive a policy assigned to that group.

The policy must target the service principal directly. Group membership can organize inventory, but it is not an enforcement shortcut.

These exclusions are security boundaries. If the portal lets you browse a principal, that does not prove the policy will evaluate it. Validate coverage in service-principal sign-in logs.

## Managed Identity Needs Different Controls

Managed identity removes accessible credentials and should be preferred for eligible Azure workloads, but it does not fall under workload-identity Conditional Access.

Protect it by:

- limiting who can attach a user-assigned identity to compute;
- minimizing Azure RBAC and API permissions on its Principal ID;
- isolating compute and network paths;
- using separate identities for separate environments/trust boundaries;
- reviewing identity attachments and privileged role assignments;
- disabling or deleting unused resources/identities; and
- monitoring managed-identity sign-in logs.

Microsoft suggests access reviews as one governance option for managed identities where applicable. Do not wrap a managed identity in a service-principal group and assume a workload Conditional Access policy will apply.

## Third-Party and Multitenant Apps Need Different Controls

A customer cannot apply workload identity Conditional Access to arbitrary third-party SaaS or a multitenant publisher's service principal under the documented scope.

Use:

- least-privilege consent and regular grant review;
- verified publisher and application-risk evaluation;
- user assignment for interactive access;
- tenant restrictions/cross-tenant settings where applicable;
- resource-side authorization;
- vendor security controls; and
- removal or disablement of unneeded enterprise applications.

For a workload you own, consider a dedicated single-tenant service principal per tenant/environment when that reflects the architecture. Do not change a genuine multitenant SaaS model solely to force policy compatibility without evaluating consent, operations, and lifecycle.

## Build a Location Policy Safely

### 1. Confirm Egress

Workload location policies operate on observed public IP. Inventory stable egress for every region, failover path, runner, and disaster-recovery environment. Private RFC 1918 source addresses are not what Entra sees at its public token endpoint.

Avoid location enforcement when the workload uses unpredictable shared egress unless the network architecture can provide a trustworthy allowlist.

### 2. Select the Service Principal Object ID

The workload policy needs the **Object ID from Enterprise applications**—the service principal Object ID. Microsoft explicitly warns not to use the Object ID shown for the app registration/application object.

Record:

```text
Application client ID
Service principal Object ID
Tenant ID
Approved egress ranges
Owner and rollback contact
```

### 3. Use Report-Only

Create the policy in report-only mode. Exercise normal jobs, failover, scale-out, and credential rotation. Review the Conditional Access report-only results on **Service principal sign-ins**.

### 4. Test an Explicit Denial

From an approved test context, request a token from outside the allowed range and confirm the report-only or enforced result matches the design. Do not test by disrupting production egress.

### 5. Enforce and Monitor

Enable the policy during a controlled change window. Alert on blocked sign-ins, unexpected locations, and “not applied” results for the in-scope service principal.

## Risk-Based Workload Policy

Microsoft Entra ID Protection can calculate service-principal risk from signals such as anomalous behavior and compromised credential indicators. A workload Conditional Access policy can select risk levels and block access.

Risk is a detection signal, not a replacement for credential hygiene. Continue to:

- prefer managed identity or federation;
- use certificates over secrets where needed;
- rotate and remove stale credentials;
- reduce application permissions;
- protect owners and app administrators;
- review service-principal sign-ins; and
- disable compromised principals during containment.

Test risk policy in report-only mode. A block-only grant means there is no interactive remediation such as MFA; operations must have an incident response and credential-recovery path.

## Continuous Access Evaluation for Workloads

Ordinary Conditional Access is primarily evaluated at token issuance. Microsoft also documents Continuous Access Evaluation (CAE) for workload identities, which can enforce supported revocation and location/risk changes at the resource.

As of the current 2026 documentation, workload CAE has important limits:

- Microsoft Graph is the supported resource provider;
- the client must declare the `cp1` capability and handle claims challenges;
- only eligible single-tenant line-of-business service principals are supported;
- managed identities, multitenant apps, and third-party SaaS are excluded; and
- Workload Identities Premium licensing is required.

CAE-enabled workload tokens can have a lifetime up to 24 hours because the resource continuously reevaluates supported events. A client must handle a `401` claims challenge and reacquire a token. Do not enable `cp1` without implementing that protocol loop.

Verify current supported resources before using CAE as a revocation guarantee.

## Layer Workload Security

Conditional Access should be one layer:

| Layer | Control |
| --- | --- |
| Credential | Managed identity, federation, or protected certificate; secret as exception |
| Directory permission | Least-privilege app roles and consent |
| Token issuance | Workload Conditional Access for eligible service principals |
| Resource | Audience, issuer, role, tenant, ownership, and network checks |
| Operations | Sign-in logs, credential inventory, alerts, incident response |
| Governance | Owners, access reviews, stale app removal, separation of duties |

An IP allowlist cannot compensate for a leaked broad secret on the same network. A safe credential cannot compensate for excessive Microsoft Graph application permissions. Apply both.

## Common Mistakes

### Targeting the app registration Object ID

Select the enterprise application's service principal Object ID.

### Assigning policy to a group of service principals

Microsoft states that group-assigned workload policies are not enforced. Add each supported service principal directly.

### Expecting MFA

Workloads cannot complete human MFA. Workload policy offers block-based controls, not user grant controls.

### Assuming managed identities are included

They are explicitly excluded from workload Conditional Access. Use managed-identity-specific governance and resource controls.

### Treating “Not applied” as success

It can mean the identity or application type is out of scope, the wrong principal was selected, or the sign-in category is wrong. Investigate.

### Blocking before testing failover

An unlisted disaster-recovery egress address turns identity policy into an outage. Test all legitimate paths in report-only mode.

## Official Documentation

- [Conditional Access for workload identities](https://learn.microsoft.com/en-us/entra/identity/conditional-access/workload-identity)
- [Plan a Conditional Access deployment](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access)
- [Continuous access evaluation for workload identities](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation-workload)
- [Service principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins)
- [Authorize applications, resources, and workloads with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/architecture/authorize-applications-resources-workloads)
- [Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing)

## Conclusion

User-scoped Conditional Access does not protect client-credential sign-ins because no user participates. Use Conditional Access for workload identities only for its documented, licensed scope: directly selected, eligible single-tenant service principals, with block controls based on supported location, risk, and authentication-context conditions. Account for the exclusions—especially managed identities and multitenant SaaS—and layer the policy with safer credentials, least privilege, resource authorization, and workload-specific monitoring.
