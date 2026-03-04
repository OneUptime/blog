# How to Manage IdM Users and Groups from the Web UI on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Identity Management, Web UI, Users, Groups, Linux

Description: Learn how to use the Red Hat Identity Management web interface on RHEL 9 to manage users, groups, and policies through a graphical browser-based console.

---

The IdM web UI provides a graphical interface for managing users, groups, policies, and other IdM objects on RHEL 9. It is ideal for administrators who prefer visual workflows and for tasks that benefit from seeing data in tabular or form-based layouts.

## Accessing the Web UI

Open a browser and navigate to:

```text
https://idm1.example.com
```

Log in with your IdM admin credentials.

If you get a certificate warning, this is because IdM uses a self-signed certificate by default. You can import the IdM CA certificate into your browser from:

```text
https://idm1.example.com/ipa/config/ca.crt
```

## Configuring Browser for Kerberos SSO

For seamless single sign-on from your workstation:

### Firefox

1. Navigate to `about:config`
2. Search for `network.negotiate-auth.trusted-uris`
3. Set the value to `.example.com`
4. Search for `network.negotiate-auth.delegation-uris`
5. Set the value to `.example.com`

Now obtain a Kerberos ticket on your workstation:

```bash
kinit admin
```

The web UI will log you in automatically without asking for a password.

## Navigating the Web UI

The main navigation sections:

- **Identity** - Users, groups, hosts, services
- **Policy** - Host-based access control, sudo rules, password policies
- **Authentication** - Certificates, OTP tokens
- **Network Services** - DNS zones and records

## Managing Users

### Creating a User

1. Navigate to Identity > Users > Active Users
2. Click the "Add" button
3. Fill in the required fields:
   - User login
   - First name
   - Last name
4. Optionally set:
   - Email address
   - Phone number
   - Job title
   - SSH public keys
5. Click "Add" to create the user

### Viewing and Editing a User

1. Navigate to Identity > Users > Active Users
2. Click on the username
3. The detail page shows all user attributes in organized tabs:
   - **Details** - Personal information
   - **Account** - Password expiration, Kerberos settings
   - **Member Of** - Groups the user belongs to
   - **Roles** - Administrative roles assigned
4. Make changes and click "Save"

### Disabling a User

1. Navigate to the user detail page
2. Click the "Disable" button in the actions menu
3. The user appears with a disabled indicator

### Deleting and Preserving Users

1. Select users with checkboxes
2. Click "Delete"
3. Choose "Delete" or "Preserve"
4. Preserved users can be found under Identity > Users > Preserved Users

## Managing Groups

### Creating a Group

1. Navigate to Identity > Groups > User Groups
2. Click "Add"
3. Enter the group name and description
4. Select the group type (POSIX or non-POSIX)
5. Click "Add"

### Adding Members to a Group

1. Click on the group name
2. Go to the "Members" tab
3. Click "Add"
4. Search for and select users
5. Click the right arrow to add them
6. Click "Add"

### Nested Groups

1. In the group detail page, go to the "Members" tab
2. Switch to the "User Groups" subtab
3. Add groups as members of other groups

## Managing Password Policies

1. Navigate to Policy > Password Policies
2. Click on the global policy or a group-specific policy
3. Modify settings:
   - Maximum lifetime (days)
   - Minimum lifetime (days)
   - History size
   - Minimum length
   - Character classes required
4. Click "Save"

## Managing Host Groups

1. Navigate to Identity > Groups > Host Groups
2. Create host groups for organizing servers by role
3. Add hosts as members

## Viewing Audit Logs

1. Navigate to Identity > Users and select a user
2. The "Account" tab shows last login times
3. Use the search bar to find specific actions

## Bulk Operations

While the web UI does not directly support CSV imports, you can:

1. Use the web UI to create templates
2. Use the "Add and Add Another" button for consecutive creation
3. For large batches, use the CLI instead

## Customizing the UI

### Setting the Default Shell

1. Navigate to IPA Server > Configuration
2. Set the "Default shell" field
3. Click "Save"

### Configuring Email Domain

1. Navigate to IPA Server > Configuration
2. Set the "Default email domain"
3. Click "Save"

## Troubleshooting the Web UI

### Cannot Access the Web UI

Check that httpd is running:

```bash
sudo systemctl status httpd
```

Check firewall:

```bash
sudo firewall-cmd --list-services
```

### Session Timeout

If sessions expire too quickly, adjust the session timeout in:

```bash
sudo vi /etc/httpd/conf.d/ipa.conf
```

### Kerberos SSO Not Working

Verify your Kerberos ticket:

```bash
klist
```

Check browser configuration for negotiate-auth settings.

## Summary

The IdM web UI on RHEL 9 provides an intuitive graphical interface for managing users, groups, policies, and other identity objects. Configure your browser for Kerberos SSO to streamline access, use the tabbed interface for detailed user management, and combine with CLI tools for bulk operations. The web UI is particularly useful for reviewing configurations and performing one-off administrative tasks.
