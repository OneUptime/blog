# Configure Read-Only Iguazio Roles Without Granting Service Administration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Security, Access Control

Description: Configure Iguazio observer access by separating management policies, inherited permissions, project membership, and data access from service administration.

An engineer investigating an incident needs to inspect the platform, but should not be able to restart a shared notebook service. Granting Service Admin to make a missing service appear can turn that observer into an operator.

This guide targets the Iguazio AI Platform 3.7 authorization model documented at publication. Start with a dedicated observer account and an explicit list of required pages, projects, and data paths. Treat access to an interactive notebook or shell as a separate requirement from viewing status.

## Choose policies for the required views

Use these management policies as the starting point:

| Required view | Policy | Boundary to check |
|---|---|---|
| Application reports and permitted services | Application Read Only | Running services additionally requires Data |
| Cluster, storage, and event information | IT Admin Read Only | Assign directly for application-cluster status access |
| Project list | Project Read Only | Reveals all projects; membership controls access to their contents |

The application policy does not provide a read-only view of every user's services. Project visibility also does not authorize reading stored datasets. [Iguazio management policies](https://www.iguazio.com/docs/latest-release/users-and-security/authorization/#management-policies), [platform-user requirements](https://www.iguazio.com/docs/latest-release/users-and-security/users/#overview)

For example, an infrastructure observer may need only the cluster policy. An application reviewer may need the application and project policies. Write down the expected scope before assigning all three by habit. If even project-name visibility is too broad, the project-list option above does not meet that requirement; resolve that boundary before provisioning the account.

## Remove unintended grants before adding read-only access

Have a user with Security Admin perform the identity changes from the dashboard's **Identity** page. That permission belongs to the person configuring access. [Iguazio user administration](https://www.iguazio.com/docs/latest-release/users-and-security/users/#overview)

1. Select the observer account and record its assigned management policies and group memberships.
2. Inspect every listed group in **Identity → Groups** and record its policies too.
3. Replace unnecessary direct grants with the selected observer policies. Check especially for Service Admin, Application Admin, Developer, and administrative policies.
4. Remove the observer from groups that restore unwanted privileges, or create a separate observer group. Avoid changing a shared operational group's policies just to accommodate one reviewer.
5. Save the identity changes and reopen the records to confirm the intended assignments persisted.

Management grants from groups accumulate. Adding a read-only policy does not neutralize an administrative grant from another membership. [Iguazio permission inheritance](https://www.iguazio.com/docs/latest-release/users-and-security/authorization/#management-policies)

Do not assume that a newly created account has safe defaults. Iguazio's Users API supports explicitly setting `assigned_policies` during creation; use that option in provisioning automation and inspect the resulting account. [Iguazio Users API](https://www.iguazio.com/docs/latest-release/cluster-mgmt/mgmt-sdk/users-sdk/#create-a-user)

## Keep service visibility separate from administration

Service Admin can change service configuration and lifecycle, including restarting and deleting services. Ordinary users see their own running services and services shared with them; service administrators see the broader tenant inventory. [Iguazio service behavior](https://www.iguazio.com/docs/latest-release/services/fundamentals/#overview)

If a service is absent from the observer's view, first compare the service's running user and sharing configuration with the access request. Do not treat the difference from an administrator's screen as proof of a broken role. For tenant-wide operational visibility, arrange a dashboard or report with separately controlled viewer access instead of expanding the observer's service privileges.

Sharing an interactive service deserves particular attention. Iguazio documents that a service launched from another service uses the parent service's running-user permissions. A shared shell can therefore expose a different execution identity from the person signed into the dashboard. [Iguazio shared-service execution](https://www.iguazio.com/docs/latest-release/services/fundamentals/#overview)

Record the running identity of each accessible notebook or shell. Test what it can actually do before calling the account read-only. A role label on the dashboard is not evidence that arbitrary code inside an accessible service is harmless.

## Add project membership deliberately

For each approved project, have its owner open the project and select **Manage** beside its members. Assign **Viewer**, which allows inspection without changing project objects. Keep this separate from the Project Read Only management policy. [Iguazio project membership](https://www.iguazio.com/docs/latest-release/users-and-security/authorization/#project-members)

Check the effective membership, including groups. Iguazio's management SDK exposes a read-only query for this. With the SDK installed and an authenticated administrative `client`, substitute your existing names:

```python
import igz_mgmt

project = igz_mgmt.Project.get_by_name(client, "incident-review")
observer = igz_mgmt.User.get_by_username(client, "operations-observer")
print(project.get_user_effective_role(client, observer))
```

The effective-role lookup accounts for stronger group membership. A direct Viewer assignment cannot reduce a group-derived Editor role. Review the project's editor and administrator groups when the result is broader than expected. [Iguazio Projects API](https://iguazio.github.io/igz-mgmt-sdk/examples/projects.html#get-effective-role-of-user-in-project)

## Decide whether the observer needs data access

Leave **Data** out unless data access or running application services is explicitly required. Data access additionally depends on POSIX permissions and container data-access policies; group matching in those policies uses the primary group. Project Viewer membership alone grants no dataset access. [Iguazio data authorization](https://www.iguazio.com/docs/latest-release/users-and-security/authorization/#data-access-authorization)

When data inspection is necessary, give the data administrator the exact container, paths, and interfaces to authorize. Ask for explicit read restrictions and a review of existing rules before enabling Data. Include both a permitted sample and an out-of-scope sample in the acceptance test. Do not turn a failed sample read into permission to modify the whole container.

## Verify with the observer's own session

Sign in through a separate browser profile as the observer. For API checks, use that account's credential: access keys carry their creator's authorization scope, so an administrator's key invalidates the test. [Iguazio authentication and access keys](https://www.iguazio.com/docs/latest-release/users-and-security/authentication/#authentication-without-sso)

Run a small acceptance checklist:

- Open each required page and approved project's contents.
- Verify that project editing and membership changes are unavailable.
- Test service configuration and restart authorization against disposable staging resources, checking the server response as well as the UI.
- If data access was approved, verify reading, denied writes, and denied access outside the approved paths.
- Repeat relevant checks from any shared interactive service the observer can open.

For accounts imported through Iguazio's direct IdP synchronization, review **Identity → IdP → Default management policies** and the sync mode. A full synchronization reapplies those defaults to imported users and groups. Include a post-sync retest so provisioning does not silently restore broader access. [Iguazio IdP synchronization](https://www.iguazio.com/docs/latest-release/users-and-security/users/#configuring-idp-synchronization)

Save the policy inventory and test results with the access-change record. If access was introduced during a OneUptime incident investigation, link that record from the incident so responders can reuse the verified setup during the next investigation.
