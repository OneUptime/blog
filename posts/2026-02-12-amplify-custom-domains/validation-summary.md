# Validation Summary: How to Set Up Amplify with Custom Domains

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify Hosting
- AWS Certificate Manager
- Amazon Route 53
- Amazon CloudFront
- DNS CNAME, ALIAS, ANAME, and apex-domain records
- Amplify redirects and rewrites
- Amplify pull request previews

## Sources Consulted
- AWS Amplify Hosting: Connecting a custom domain - https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html
- AWS Amplify Hosting: Adding a custom domain managed by Amazon Route 53 - https://docs.aws.amazon.com/amplify/latest/userguide/to-add-a-custom-domain-managed-by-amazon-route-53.html
- AWS Amplify Hosting: Adding a custom domain managed by a third-party DNS provider - https://docs.aws.amazon.com/amplify/latest/userguide/to-add-a-custom-domain-managed-by-a-third-party-dns-provider.html
- AWS Amplify Hosting: Managing subdomains - https://docs.aws.amazon.com/amplify/latest/userguide/to-manage-subdomains.html
- AWS Amplify Hosting: Setting up automatic subdomains for an Amazon Route 53 custom domain - https://docs.aws.amazon.com/amplify/latest/userguide/to-set-up-automatic-subdomains-for-a-Route-53-custom-domain.html
- AWS Amplify Hosting: Web previews for pull requests - https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html
- AWS Amplify Hosting: Redirects and rewrites - https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html
- AWS Amplify Hosting: Creating and editing redirects in the Amplify console - https://docs.aws.amazon.com/amplify/latest/userguide/creating-editing-redirects.html
- AWS Amplify Hosting: Redirects and rewrites example reference - https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html
- AWS Amplify Hosting: Troubleshooting custom domains - https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-custom-domains.html
- AWS CloudFormation: AWS::Amplify::Branch pull request preview properties - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-amplify-branch.html
- AWS Amplify Hosting: Build specification reference - https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html

## Issues Found
- The post said Amplify updates DNS records to point to CloudFront without qualifying that this automatic behavior applies to Route 53. Updated the wording to distinguish Route 53 automation from third-party manual DNS configuration.
- The post said Amplify maps branches to subdomains by default. AWS documents branch deployments on default Amplify domains, while custom subdomain mapping is configurable. Updated the wording to say Amplify lets you map deployed branches to domains/subdomains.
- The post said Cloudflare supports ALIAS records. Cloudflare's relevant apex-domain behavior is CNAME flattening, not a literal ALIAS record. Updated the recommendation to mention apex CNAME flattening or ALIAS-style records.
- The SSL status sequence included "Requesting certificate" as a console stage. AWS documentation centers the custom domain flow around "Pending verification" and "AVAILABLE." Simplified the status sequence accordingly.
- The post said Amplify handles www redirects automatically in either direction. AWS documents a default root-to-www redirect that can be modified. Updated the wording to be precise.
- The branch preview section showed a literal `Domain: pr-*.yourdomain.com` pattern, but AWS documents branch autodetection patterns and automatic subdomain creation as separate settings for Route 53 custom domains. Updated the example to reflect that.
- The pull request preview configuration snippet used unsupported `amplify.yml` fields. Replaced it with the CloudFormation `AWS::Amplify::Branch` properties `EnablePullRequestPreview` and `PullRequestEnvironmentName`, which AWS documents for branch preview configuration.
- The troubleshooting section described the apex-domain failure as a 404 caused by missing ALIAS support. Updated it to describe the more accurate DNS/apex-record issue and include ANAME, ALIAS, and flattened CNAME-style records.

## Review Notes
- The redirect and rewrite JSON examples use the documented Amplify JSON editor fields: `source`, `target`, `status`, and optional `condition`.
- The `dig` command syntax is valid for checking the CNAME record.
- AWS notes that third-party domain ownership verification and DNS propagation can take up to 48 hours, so the post's shorter timing guidance is best read as a typical case rather than a guarantee.
