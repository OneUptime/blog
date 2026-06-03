# Validation Summary: How to Configure Amplify Branch-Based Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify Hosting
- Amplify branch deployments and branch auto-detection
- Amplify build specifications (`amplify.yml`)
- Amplify environment variables and secrets
- Amplify Gen 1 backend environments
- Amazon SNS-backed Amplify build notifications
- Route 53 custom domains and automatic subdomains

## Sources Consulted
- AWS Amplify Hosting: Pattern-based feature branch deployments - https://docs.aws.amazon.com/amplify/latest/userguide/pattern-based-feature-branch-deployments.html
- AWS Amplify Gen 2: Fullstack branch deployments - https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/branch-deployments/
- AWS Amplify Hosting: Build specification reference - https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html
- AWS Amplify Hosting: Setting environment variables - https://docs.aws.amazon.com/amplify/latest/userguide/setting-env-vars.html
- AWS Amplify Hosting: Using environment variables in an Amplify application - https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html
- AWS Amplify Gen 2: Secrets and environment vars - https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/
- AWS Amplify Hosting: Managing environment secrets - https://docs.aws.amazon.com/amplify/latest/userguide/environment-secrets.html
- AWS Amplify Hosting: Restricting access to an Amplify app's branches - https://docs.aws.amazon.com/amplify/latest/userguide/access-control.html
- AWS Amplify Hosting: Setting up email notifications for builds - https://docs.aws.amazon.com/amplify/latest/userguide/notifications.html
- AWS Amplify Hosting: Setting up automatic subdomains for an Amazon Route 53 custom domain - https://docs.aws.amazon.com/amplify/latest/userguide/to-set-up-automatic-subdomains-for-a-Route-53-custom-domain.html
- AWS Amplify Hosting: Setting up wildcard subdomains - https://docs.aws.amazon.com/amplify/latest/userguide/wildcard-subdomain-support.html
- AWS Amplify API Reference: Branch - https://docs.aws.amazon.com/amplify/latest/APIReference/API_Branch.html
- AWS Amplify CLI Gen 1 commands - https://docs.amplify.aws/gen1/javascript/tools/cli/commands/

## Issues Found
- The introduction implied every Git branch automatically gets fully isolated backend resources. Updated it to clarify that connected branches get separate hosting deployments and branch-specific configuration, while backend isolation applies to fullstack apps when configured.
- The branch auto-detection section claimed exclude patterns are available. Official Amplify docs describe inclusion patterns, so the text now recommends specifying only the branch patterns that should be auto-deployed.
- The `amplify.yml` conditional build command used a multi-line YAML list item without a block scalar. Changed it to a `|` block scalar so the shell conditional is unambiguous as one build command.
- The environment variable examples used database URLs with credentials. AWS documentation warns not to store secrets in Amplify environment variables, so the examples now use non-secret configuration values and mention Amplify secrets / Gen 1 environment secrets.
- The notification section described manually creating an SNS topic and connecting it in the console, and listed build-start notifications. Amplify's documented workflow is console-managed email build notifications backed by an SNS topic that Amplify creates, for build success and failure notifications. Updated the section accordingly.
- The lifecycle section described TTL as an automatic preview environment deletion mechanism. The Amplify Branch API `ttl` field is content cache TTL, not deployment expiration. Replaced this with backend cleanup guidance.
- The auto-deletion wording implied all associated backend resources are always torn down. Updated it to branch auto-disconnection language and added a backend cleanup caveat.
- The access-control example implied password settings can be assigned directly to branch patterns. Updated it to refer to auto-detected branches instead of a `feature/*` pattern.
- The custom-domain example implied a branch pattern could be mapped directly to a wildcard preview subdomain. Updated it to show a concrete branch subdomain and mention Route 53 automatic subdomain creation for newly connected branches.
- The cost section recommended TTLs for preview environments. Replaced that with removal of unused backend environments after branch disconnection.

## Review Notes
The post now aligns with current AWS Amplify Hosting documentation. Future improvements could distinguish Gen 1 and Gen 2 branch deployment workflows more explicitly, but the current content is technically valid for a general Amplify branch deployment guide.
