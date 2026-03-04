# How to Manage IdM Users and Groups from the Web UI on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, FreeIPA, Web UI, User Management, Linux

Description: Learn how to use the Red Hat Identity Management (IdM) Web UI on RHEL to manage users, groups, and policies through a browser-based interface.

---

The IdM Web UI provides a graphical interface for managing identity resources. It is useful for administrators who prefer a visual approach or need to perform occasional tasks without memorizing CLI syntax. The Web UI is available at `https://<idm-server>/ipa/ui/`.

## Accessing the Web UI

```bash
# First, ensure your browser can reach the IdM server
# Navigate to: https://idm1.example.com/ipa/ui/

# If using a workstation not enrolled in IdM, you may need to
# add the IdM CA certificate to your browser's trust store:
# Download it from: https://idm1.example.com/ipa/config/ca.crt

# Log in with your IdM admin credentials
# Username: admin
# Password: <your admin password>
```

## Configuring Browser for Kerberos SSO

For single sign-on without entering a password each time:

```bash
# On a RHEL client enrolled in IdM, configure Firefox
# Navigate to about:config in Firefox
# Set network.negotiate-auth.trusted-uris to: .example.com

# Then get a Kerberos ticket on the command line
kinit admin

# Now browsing to the Web UI will auto-authenticate
```

## Managing Users via the Web UI

The user management workflow in the Web UI:

1. Navigate to **Identity** > **Users** > **Active Users**
2. Click **Add** to create a new user
3. Fill in: User login, First name, Last name, and optionally Class, email
4. Click **Add** to save

To modify a user:
1. Click the username in the user list
2. Edit any field (shell, email, SSH keys, etc.)
3. Click **Save** at the top

## Managing Groups via the Web UI

1. Navigate to **Identity** > **Groups** > **User Groups**
2. Click **Add** to create a group
3. Enter the group name and description
4. To add members, click the group name, then the **Members** tab
5. Click **Add** and select users or groups to include

## Setting Up Host-Based Access

```bash
# The Web UI also manages HBAC rules:
# Navigate to Policy > Host-Based Access Control > HBAC Rules
# Create rules to control which users can access which hosts
```

## Comparing CLI vs Web UI

```bash
# Any action in the Web UI can also be done via CLI
# The Web UI calls the same API endpoints

# Example: Creating a user via CLI equivalent
ipa user-add jdoe --first=Jane --last=Doe

# Check the Web UI to see the user appears immediately
# Changes made in either interface are visible in both
```

The Web UI is useful for exploration and one-off tasks. For repeatable operations or automation, the `ipa` CLI or the JSON-RPC API is more appropriate. All changes are replicated across IdM servers regardless of which interface or server was used.
