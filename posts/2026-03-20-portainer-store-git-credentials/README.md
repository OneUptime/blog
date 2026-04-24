# How to Store Git Credentials in Portainer User Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Git, Credential, User Setting, GitOps, Security, Stack

Description: Learn how to save and manage Git credentials in Portainer user settings for automatically authenticating to private Git repositories when deploying stacks.

---

Portainer can deploy stacks directly from Git repositories. For private repositories, you need to provide credentials. In Portainer Business Edition, storing them in user settings lets you reuse them without re-entering on every deployment.

## Saving Git Credentials

1. Log in to Portainer.
2. Click your username → **My Account**.
3. Scroll to **Git credentials**.
4. Click **Add git credential**.
5. Enter a **Name** (e.g., "GitHub Personal"), choose the appropriate **Authorization type**, then enter your **Username** and **Personal Access Token** (recommended over password).
6. Click **Save git credential**.

## Using a Personal Access Token (Recommended)

Git providers support tokens that can be limited to repository read access:

**GitHub PAT:**
1. Go to `github.com` → **Settings → Developer settings → Personal access tokens**.
2. Generate either a fine-grained token with repository **Contents** permission set to **Read-only**, or a classic token with the `repo` scope.
3. Copy the token and use it as the password in Portainer.

**GitLab PAT:**
1. Go to `gitlab.com` → your avatar → **Edit profile → Access → Personal access tokens**.
2. Create a token with `read_repository` scope.

## Deploying a Stack from a Private Repository

After saving credentials:

1. In Portainer go to **Stacks > Add Stack**.
2. Choose **Git repository** as the deployment method.
3. Enter the repository URL (e.g., `https://github.com/myorg/private-repo`).
4. Turn on **Authentication**, then choose your saved entry from **Git Credentials**.
5. Set the repository reference and compose path.
6. Click **Deploy the stack**.

## SSH Key Authentication

For stack deployments from Git, Portainer documents saved credentials in **My Account > Git credentials** for HTTPS authentication with a username and token or password. Portainer's **SSH** credential type is documented for Kubernetes provisioning, not for Git repository authentication in stack deployments.

## Credential Security

Portainer stores its configuration, including Git credentials, in its BoltDB database under the `portainer_data` volume. To protect credentials at rest, enable Portainer database encryption with a secret when starting the Portainer Server. To protect credentials:

- Back up the Portainer data volume securely
- Use tokens with minimal required scopes
- Rotate tokens periodically (create new token → update in Portainer → revoke old token)

## Auto-Update Stacks from Git

After setting up credentials, enable automatic stack updates:

1. In the stack's Git settings, enable **GitOps updates**.
2. Choose **Polling** or **Webhook**. If you use polling, set the fetch interval (e.g., every 5 minutes).

Portainer checks the latest commit hash and, when it changes, pulls the repository and redeploys using the configured Compose path.
