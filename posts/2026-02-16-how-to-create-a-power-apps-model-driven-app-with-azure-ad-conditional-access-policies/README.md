# How to Create a Power Apps Model-Driven App with Azure AD Conditional Access Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power Apps, Model-Driven App, Azure AD, Conditional Access, Security, Power Platform, Dataverse

Description: Build a Power Apps model-driven app secured with Azure AD Conditional Access policies to enforce MFA, device compliance, and location-based restrictions.

---

Model-driven apps in Power Apps run on top of Dataverse and inherit the security framework of the Power Platform. But relying solely on Dataverse security roles is not enough for many enterprise environments. Azure AD Conditional Access policies add another layer by controlling how and from where users can access your app. You can require multi-factor authentication, block access from unmanaged devices, restrict access to specific network locations, and more.

This guide covers building a model-driven app and then layering Azure AD Conditional Access policies on top of it.

## Part 1: Building the Model-Driven App

### Define the Data Model in Dataverse

Before building the app, set up your tables in Dataverse. For this example, we will build a simple project management app.

1. Go to Power Apps maker portal > Tables > New table.
2. Create a Projects table with these columns:
   - Name (primary column, text)
   - Description (multiline text)
   - Start Date (date only)
   - End Date (date only)
   - Status (choice: Not Started, In Progress, Completed, On Hold)
   - Priority (choice: Low, Medium, High, Critical)
   - Owner (lookup to User)

3. Create a Tasks table:
   - Name (primary column, text)
   - Project (lookup to Projects)
   - Assigned To (lookup to User)
   - Due Date (date only)
   - Status (choice: Open, In Progress, Done)
   - Notes (multiline text)

### Configure Security Roles

Create a custom security role for the app:

1. Go to the Power Platform Admin Center > Environments > your environment > Security roles.
2. Create a new role called "Project Manager".
3. Grant the following permissions:
   - Projects table: Create, Read, Write, Delete at Organization level
   - Tasks table: Create, Read, Write, Delete at Organization level
4. Create another role called "Project Viewer" with only Read permissions.

### Build the Model-Driven App

1. In Power Apps maker portal, click New app > Model-driven.
2. Name it "Project Management".
3. Add the Projects and Tasks tables to the app sitemap.
4. Configure the forms:
   - Main form for Projects with sections for details, timeline, and related tasks.
   - Main form for Tasks with project lookup and status fields.
5. Configure views:
   - Active Projects (filtered by Status not equal to Completed)
   - My Projects (filtered by Owner equals current user)
   - All Tasks by Project (grouped by Project)
6. Add a dashboard with charts showing project status distribution and tasks by assignee.
7. Publish the app.

### Test the App

Before adding Conditional Access, make sure the app works:

1. Assign the "Project Manager" security role to a test user.
2. Share the app with that user.
3. Have them open the app and create a project with tasks.
4. Verify the security roles work - a user with "Project Viewer" should not be able to edit.

## Part 2: Configuring Conditional Access Policies

Conditional Access policies are configured in Azure AD and apply to cloud apps. Power Apps (including model-driven apps) is registered as a cloud app called "Microsoft Power Apps" or "Common Data Service" (for Dataverse access).

### Identify the Target Cloud Apps

Model-driven apps access data through Dataverse. The relevant cloud app IDs are:

- **Microsoft Power Apps**: `475226c6-020e-4fb2-8571-c63d2a8efb72`
- **Common Data Service** (Dataverse): `00000007-0000-0000-c000-000000000000`

You can target either or both depending on the scope of your policy.

### Policy 1: Require MFA for Power Apps Access

This policy forces users to complete multi-factor authentication before accessing any model-driven app.

1. Go to Azure portal > Azure AD > Security > Conditional Access > New policy.
2. Name: "Require MFA for Power Apps"
3. Assignments:
   - Users: Select the groups that use your model-driven app (e.g., "Project Managers" group)
   - Cloud apps: Select "Common Data Service"
4. Conditions: Leave as default (all conditions)
5. Access controls > Grant: Select "Require multi-factor authentication"
6. Enable the policy.

### Policy 2: Block Access from Non-Compliant Devices

If your organization uses Intune for device management, you can require device compliance:

1. Create a new Conditional Access policy.
2. Name: "Require Compliant Device for Power Apps"
3. Assignments:
   - Users: Same groups as above
   - Cloud apps: "Common Data Service"
4. Conditions:
   - Device platforms: Select All platforms (or specific ones like iOS, Android, Windows)
5. Access controls > Grant: Select "Require device to be marked as compliant"
6. Enable the policy.

### Policy 3: Restrict Access to Corporate Network

For sensitive data, you might want to restrict access to your corporate network:

1. First, define your Named locations under Azure AD > Security > Conditional Access > Named locations.
2. Add your corporate IP ranges as a trusted location.
3. Create a new policy.
4. Name: "Block Power Apps from Non-Corporate Networks"
5. Assignments:
   - Users: Select appropriate groups
   - Cloud apps: "Common Data Service"
6. Conditions:
   - Locations: Include "Any location", Exclude your trusted corporate locations
7. Access controls > Grant: Block access
8. Enable the policy.

### Policy 4: Session Controls for Unmanaged Devices

Rather than blocking unmanaged devices entirely, you can apply session restrictions:

1. Create a new policy.
2. Name: "Limited Session for Unmanaged Devices"
3. Assignments:
   - Users: Select groups
   - Cloud apps: "Common Data Service"
4. Conditions:
   - Filter for devices: Exclude compliant devices
5. Access controls > Session:
   - Sign-in frequency: 1 hour (forces re-authentication hourly)
   - Persistent browser session: Disabled (no "stay signed in")
6. Enable the policy.

## Testing Conditional Access Policies

### Use the What If Tool

Before enforcing policies, test them with Azure AD's What If tool:

1. Go to Azure AD > Security > Conditional Access > What If.
2. Select a test user.
3. Select "Common Data Service" as the cloud app.
4. Set conditions (device platform, location, etc.).
5. Click "What If" to see which policies would apply.

This tool helps you verify that your policies target the right users and conditions without accidentally locking anyone out.

### Test with Report-Only Mode

Enable new policies in "Report-only" mode first:

1. When creating the policy, set "Enable policy" to "Report-only".
2. Users can still access the app, but Azure AD logs what would have happened.
3. Check the sign-in logs after a few days to see the impact.
4. When you are confident, switch the policy to "On".

### Test the User Experience

Have a test user go through each scenario:

1. Sign in without MFA configured - they should be prompted to set up MFA.
2. Sign in from a non-compliant device - they should see a "Your device needs to be enrolled" message.
3. Sign in from outside the corporate network - they should see an access blocked message (for Policy 3).
4. Sign in from an unmanaged device - they should be able to access but get re-prompted after the session timeout.

## Combining App-Level and Azure AD Security

The model-driven app has multiple security layers that work together:

1. **Azure AD Conditional Access**: Controls who can access the platform and under what conditions.
2. **Dataverse security roles**: Controls what data users can see and modify.
3. **Business rules**: Controls field-level validation and visibility.
4. **Column-level security**: Controls access to specific sensitive columns.

Think of it as a layered defense. Conditional Access is the outer perimeter, security roles are the building walls, and column security is the vault door.

## Monitoring and Alerting

Set up monitoring for your Conditional Access policies:

1. **Azure AD Sign-in Logs**: Review these regularly to spot blocked access attempts or policy failures.
2. **Azure Monitor Alerts**: Create alerts for unusual sign-in patterns, like multiple blocked attempts from the same user.
3. **Power Automate Integration**: Build a flow that checks Azure AD sign-in logs and sends alerts to a Teams channel when access is blocked.

## Common Pitfalls

**Policy conflicts**: If you have multiple Conditional Access policies, they are evaluated together. The most restrictive set of controls applies. Test carefully to avoid accidentally requiring contradictory controls.

**Service account access**: If you have Power Automate flows that use service accounts to access Dataverse, make sure those accounts are excluded from device compliance policies (they are not associated with a physical device).

**Legacy authentication**: Some older clients use legacy authentication protocols that do not support MFA or Conditional Access. Block legacy authentication with a separate policy.

**Emergency access accounts**: Always have at least one break-glass account excluded from all Conditional Access policies. Store its credentials securely. If something goes wrong with your policies, this account can fix things.

## Wrapping Up

Model-driven Power Apps combined with Azure AD Conditional Access give you a robust security posture. The model-driven app handles data-level security through Dataverse roles, while Conditional Access handles access-level security based on user identity, device state, and network location. Start with MFA as a baseline, add device compliance if you use Intune, and layer on location restrictions for sensitive apps. Always test in report-only mode before enforcing, and maintain emergency access accounts as a safety net.
