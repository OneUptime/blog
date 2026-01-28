# How to Use Jenkins with GitHub Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jenkins, GitHub, Webhooks, CI/CD, Automation

Description: Learn how to connect GitHub webhooks to Jenkins so builds trigger automatically on pushes and pull requests.

---

Polling is slow and wasteful. GitHub webhooks let Jenkins react instantly to code changes. This guide shows how to wire them up safely.

## Step 1: Install Required Plugins

Install:

- **GitHub plugin**
- **GitHub Branch Source**

## Step 2: Configure Jenkins GitHub Credentials

Create a GitHub token and add it to Jenkins as a credential. Use a least-privilege token that only needs repo webhook access.

## Step 3: Create a Multibranch Pipeline

Use a Jenkinsfile in your repo and create a multibranch pipeline. Jenkins will discover branches and PRs automatically.

## Step 4: Configure the Webhook in GitHub

In your repo:

1. Go to **Settings → Webhooks**
2. Payload URL: `https://jenkins.example.com/github-webhook/`
3. Content type: `application/json`
4. Events: push and pull request

## Step 5: Verify Delivery

GitHub shows webhook delivery status. Use this to diagnose bad URLs or authentication problems.

## Common Issues

- Jenkins URL not publicly reachable
- Missing `github-webhook/` endpoint
- Incorrect token permissions

## Conclusion

Webhooks make Jenkins builds faster and more reliable. Once configured, your pipelines trigger instantly with each change.
