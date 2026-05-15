# Validation Summary: How to Integrate Jenkins with GitHub Webhooks on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Jenkins
- Jenkins GitHub plugin
- Jenkins Pipeline
- GitHub webhooks
- GitHub REST API
- firewalld

## Sources Consulted
- Jenkins GitHub plugin documentation: https://plugins.jenkins.io/github
- Jenkins Pipeline triggers step reference: https://www.jenkins.io/doc/pipeline/steps/params/pipelinetriggers/
- Jenkins CSRF protection documentation: https://www.jenkins.io/doc/book/security/csrf-protection/
- GitHub REST API documentation for repository webhooks: https://docs.github.com/en/rest/repos/webhooks
- GitHub documentation for creating webhooks: https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks
- GitHub OAuth app scope documentation: https://docs.github.com/en/developers/apps/scopes-for-oauth-apps
- Red Hat firewalld documentation for RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/using-and-configuring-firewalld_configuring-and-managing-networking

## Issues Found
- The GitHub webhook example subscribed to both `push` and `pull_request` events, but the Jenkins `githubPush()` trigger and "GitHub hook trigger for GITScm polling" behavior are for GitHub push hooks. Changed the webhook event list to `["push"]` to match the Jenkins trigger being configured.
- The GitHub API example used the older `Authorization: token` header and omitted GitHub's recommended `Accept: application/vnd.github+json` header. Updated the example to use `Authorization: Bearer` and include the recommended Accept header.
- The personal access token guidance required both `repo` and `admin:repo_hook`, which is broader than necessary. Adjusted the wording so `repo` is used for private repository webhooks and `admin:repo_hook` is presented as the repository-hook-management scope.
- The troubleshooting note said to configure CSRF protection to allow the webhook URL in Jenkins security settings. Jenkins core CSRF documentation does not describe a URL allow-list for this. Replaced it with checks for the documented `/github-webhook/` endpoint and installed/enabled GitHub plugin.

## Review Notes
The Jenkins CLI install command, Pipeline `githubPush()` trigger, GitHub webhook endpoint shape, webhook JSON fields, and RHEL `firewall-cmd --permanent --add-service=https` usage were consistent with the official documentation reviewed. For pull request automation, the post would need a separate workflow using an appropriate Jenkins GitHub pull request or branch source configuration.
