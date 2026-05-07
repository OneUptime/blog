# How to Configure GitHub Authentication in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, GitHub, RBAC

Description: Learn how to set up GitHub OAuth authentication in Rancher to allow team members to log in with their GitHub accounts.

GitHub authentication in Rancher allows your team members to log in using their GitHub accounts. This is especially useful for organizations that already use GitHub for code collaboration. With GitHub auth enabled, you can manage Rancher access based on GitHub organization and team membership. This guide covers the complete setup.

## Prerequisites

- Rancher v2.6 or later with admin access
- A GitHub account with admin access to your GitHub organization
- The Rancher server accessible via HTTPS from users' browsers
- GitHub organization membership for your team

## Step 1: Create a GitHub OAuth Application

Register Rancher as an OAuth application in GitHub:

1. In GitHub, go to **Settings**.
2. Navigate to **Developer settings** then **OAuth Apps**.
3. Click **New OAuth App**.

Fill in the application details:

```plaintext
Application Name: Rancher
Homepage URL: https://rancher.example.com
Application Description: Rancher Kubernetes Management Platform
Authorization callback URL: https://rancher.example.com/verify-auth
```

4. Click **Register application**.

## Step 2: Note the Client Credentials

After registration, you will see:

```plaintext
Client ID: xxxxxxxxxxxxxxxxxxxxxxx
```

Click **Generate a new client secret** and copy it immediately:

```plaintext
Client Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Store these values securely as you will need them for the Rancher configuration.

## Step 3: Configure GitHub Auth in Rancher

Set up GitHub authentication in Rancher:

1. Log in to Rancher as an administrator.
2. Navigate to **Users & Authentication** then **Auth Provider**.
3. Select **GitHub**.

Enter the credentials:

```plaintext
Client ID: xxxxxxxxxxxxxxxxxxxxxxx
Client Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

For GitHub Enterprise Server, select the private GitHub Enterprise option and provide:

```plaintext
GitHub Enterprise Host: github.company.com
```

## Step 4: Configure Access Restrictions

Set which GitHub users and groups can access Rancher:

1. Under **Site Access**, select the access level:

```plaintext
☐ Allow any valid user
☐ Allow members of clusters and projects, plus authorized users & groups
☑ Restrict access to only the authorized users & groups
```

2. Add authorized users and groups:

```plaintext
Authorized Users & Groups:
  - my-company-org
  - my-company-org/platform-team
  - my-company-org/developers
  - my-company-org/devops
```

## Step 5: Authenticate with GitHub

Authenticate with GitHub before enabling:

1. Click **Authenticate with GitHub**.
2. You will be redirected to GitHub to authorize the Rancher application.
3. Log in with your GitHub credentials if prompted.
4. Authorize the application.
5. Verify you are redirected back to Rancher with your GitHub user information.

Check that the following information is returned correctly:

- GitHub username
- Display name
- Organization memberships
- Team memberships

## Step 6: Enable GitHub Authentication

After successful testing:

1. Click **Enable** to activate GitHub authentication.
2. Confirm the action.

The Rancher login page will now show a **Log in with GitHub** button alongside local authentication.

## Step 7: Map GitHub Teams to Rancher Roles

Assign Rancher roles based on GitHub team membership:

For global roles:

1. Navigate to **Users & Authentication** then **Groups**.
2. Search for GitHub organizations or teams.
3. Assign the appropriate role.

```plaintext
GitHub Team: my-company-org/platform-admins -> Administrator
GitHub Team: my-company-org/devops -> Standard User
GitHub Team: my-company-org/developers -> Standard User
GitHub Team: my-company-org/interns -> User-Base
```

For cluster-level roles:

1. Navigate to a specific cluster.
2. Go to **Cluster Members** then **Add**.
3. Search for the GitHub team.
4. Assign the cluster role.

```plaintext
GitHub Team: my-company-org/backend-team -> Cluster Member (production)
GitHub Team: my-company-org/frontend-team -> Cluster Member (staging)
```

## Step 8: Configure GitHub Enterprise Server

For organizations using GitHub Enterprise Server:

1. In the GitHub auth configuration, select the private GitHub Enterprise installation option.
2. Enter your GitHub Enterprise host:

```plaintext
GitHub Enterprise Host: github.company.com
```

3. Create the OAuth application on your GitHub Enterprise instance from **Settings** > **Developer settings** > **OAuth Apps**.

4. Use the same callback URL format:
   `https://rancher.example.com/verify-auth`

Test connectivity:

```bash
# Verify the GitHub Enterprise API is reachable from Rancher and that TLS validation succeeds

kubectl exec -it $(kubectl get pod -l app=rancher -n cattle-system -o jsonpath='{.items[0].metadata.name}') \
  -n cattle-system -- \
  curl -sS "https://github.company.com/api/v3" | head -5
```

## Step 9: Manage User Sessions

Configure session settings for GitHub-authenticated users:

```bash
# Set user session TTL (in minutes)
curl -s -k \
  -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "960"}' \
  "https://rancher.example.com/v3/settings/auth-user-session-ttl-minutes"
```

When a user's GitHub access is revoked (removed from the organization or team), future access will fail once their GitHub membership no longer satisfies Rancher's Site Access rules. Existing permissions can persist until the user logs out, the session expires, or an administrator refreshes group memberships.

To immediately revoke access:

1. Go to **Users & Authentication** then **Users**.
2. Find the user.
3. Click the three-dot menu and select **Disable** or **Delete**.

## Step 10: Troubleshoot GitHub Auth Issues

Common issues and solutions:

```bash
# Check Rancher logs for GitHub auth errors
kubectl logs -l app=rancher -n cattle-system --tail=200 | grep -i "github\|auth\|oauth"
```

| Issue | Cause | Solution |
|-------|-------|----------|
| Callback URL mismatch | URL in GitHub app does not match Rancher | Verify the callback URL is exactly `https://rancher.example.com/verify-auth` |
| Organization or team not found | User is not in the expected org/team, or the OAuth app has not been approved for the organization | Verify org/team membership and approve the OAuth app for the organization if OAuth app access restrictions are enabled |
| Token expired | GitHub token expired | User needs to re-authenticate |
| Rate limiting | Too many API calls to GitHub | Check GitHub API rate limits and consider caching |
| SSL error (Enterprise) | Rancher does not trust the GitHub Enterprise certificate chain | Use a certificate Rancher trusts, or add the issuing CA to the Rancher server trust store |

To verify GitHub API connectivity:

```bash
# Test GitHub API access with the OAuth token
curl -H "Authorization: token <github-token>" \
  "https://api.github.com/user/orgs"
```

## Best Practices

- **Use organization-based access**: Restrict Rancher access to specific GitHub organizations rather than allowing all GitHub users.
- **Map teams to roles**: Use GitHub teams for granular role mapping rather than managing individual user permissions.
- **Rotate client secrets**: Periodically regenerate the OAuth application client secret and update it in Rancher.
- **Enable GitHub 2FA**: Require two-factor authentication in your GitHub organization for an additional security layer.
- **Monitor OAuth app access**: Review the Rancher OAuth application's authorized users periodically in GitHub.

## Conclusion

GitHub authentication in Rancher simplifies access management for teams already using GitHub. By mapping GitHub organizations and teams to Rancher roles, you create a natural access control structure that mirrors your development team organization. The setup is straightforward, and GitHub's built-in two-factor authentication adds an extra layer of security to your Kubernetes management platform.
