# How to Integrate Jenkins with GitHub Webhooks on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Jenkins, GitHub, Webhooks, CI/CD, Automation

Description: Set up GitHub webhooks to trigger Jenkins builds automatically on push events, enabling a seamless CI/CD workflow on RHEL.

---

Triggering Jenkins builds automatically when code is pushed to GitHub eliminates manual intervention and speeds up your CI/CD pipeline. This guide covers configuring GitHub webhooks with Jenkins on RHEL.

## Prerequisites

- Jenkins running on RHEL with a public URL (or tunneled via ngrok for testing)
- A GitHub repository you own or administer
- The GitHub plugin installed on Jenkins

## Install the GitHub Plugin

```bash
# Install the plugin via Jenkins CLI (if you have CLI configured)
java -jar jenkins-cli.jar -s http://localhost:8080/ install-plugin github

# Or install from the UI:
# Manage Jenkins > Plugins > Available > Search "GitHub Integration Plugin"
```

## Create a GitHub Personal Access Token

Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic) and generate a token with these scopes:
- `repo` (full control of private repos)
- `admin:repo_hook` (manage webhooks)

## Configure GitHub Server in Jenkins

1. Navigate to Manage Jenkins > System
2. Scroll to "GitHub" section
3. Click "Add GitHub Server"
4. Add credentials using the personal access token (Kind: Secret text)
5. Test the connection

## Set Up a Jenkins Pipeline Job

Create a new Pipeline job and configure it:

```groovy
// Jenkinsfile in your repository root
pipeline {
    agent any

    triggers {
        // This tells Jenkins to accept GitHub webhook triggers
        githubPush()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Build') {
            steps {
                sh 'make build'
            }
        }
        stage('Test') {
            steps {
                sh 'make test'
            }
        }
    }
}
```

In the job configuration, under "Build Triggers", check "GitHub hook trigger for GITScm polling".

## Configure the GitHub Webhook

```bash
# You can create the webhook via GitHub API
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "web",
    "active": true,
    "events": ["push", "pull_request"],
    "config": {
      "url": "https://jenkins.example.com/github-webhook/",
      "content_type": "json",
      "insecure_ssl": "0"
    }
  }' \
  https://api.github.com/repos/OWNER/REPO/hooks
```

## Firewall Configuration on RHEL

Make sure Jenkins is reachable from GitHub:

```bash
# Allow HTTPS traffic if using SSL
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Verify the Integration

Push a commit to your repository and check the Jenkins job. You should see a build triggered automatically within seconds. Check the webhook delivery status on GitHub under Settings > Webhooks > Recent Deliveries.

If you see a 403 error, make sure CSRF protection is configured to allow the webhook URL in Jenkins security settings.
