# Validation Summary: How to Configure Amplify Redirects and Rewrites

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Amplify Hosting
- Redirects and rewrites
- Reverse proxy rewrites
- SPA routing
- CloudFormation
- JSON and YAML configuration
- curl

## Sources Consulted
- AWS Amplify Hosting: Setting up redirects and rewrites for an Amplify application: https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html
- AWS Amplify Hosting: Creating and editing redirects in the Amplify console: https://docs.aws.amazon.com/amplify/latest/userguide/creating-editing-redirects.html
- AWS Amplify Hosting: Redirects and rewrites example reference: https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html
- AWS Amplify Hosting: Troubleshooting redirects and rewrites: https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-redirects.html
- AWS CloudFormation: AWS::Amplify::App CustomRule: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-amplify-app-customrule.html
- AWS Amplify API Reference: CustomRule: https://docs.aws.amazon.com/amplify/latest/APIReference/API_CustomRule.html
- AWS Amplify Hosting: Build specification reference: https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html
- AWS Amplify Hosting: Setting custom headers for an Amplify app: https://docs.aws.amazon.com/amplify/latest/userguide/custom-headers.html
- AWS Amplify Hosting: Amplify Hosting service quotas: https://docs.aws.amazon.com/amplify/latest/userguide/quotas-chapter.html

## Issues Found
- The post incorrectly said redirect and rewrite rules can be configured in `customHttp.yml` or a `redirects` section in `amplify.yml`. AWS documents `customHttp.yml` for custom headers and `amplify.yml` for build settings, while redirect/rewrite custom rules can be managed in the console or as Amplify app custom rules. I changed the guidance to recommend infrastructure as code and replaced the invalid `amplify.yml` snippet with a CloudFormation `AWS::Amplify::App` `CustomRules` example.
- The conditional redirect example used a header-style object with `CloudFront-Viewer-Country`. AWS documents the Amplify `condition` field as a string such as `"<US>"` for a two-letter country code. I changed the example to use `"<DE>"` and narrowed the text to country-based routing.
- The trailing slash examples used invalid or unsupported wildcard placement, including `/<*>/`, while AWS documents that `<*>` must appear once and at the end of the source pattern. I removed those examples and replaced them with the documented Amplify clean URL behavior.
- The proxy rewrite limitations listed specific response-size, timeout, and WebSocket claims that were not supported by the AWS Amplify redirect/rewrite documentation consulted. I replaced them with the documented HTTPS-only requirement for reverse proxy targets and kept the latency caveat.
- The SPA regex JSON snippets used `|.` instead of a literal-dot match and needed JSON-safe escaping. I changed the JSON examples to use `\\.` so the snippets parse as JSON while representing the intended regular expression.
- The CloudFormation YAML snippet now quotes rule strings containing wildcards and regular expression characters so they remain valid YAML scalars.
- The post claimed a 200-rule maximum for redirects and rewrites, but the current Amplify Hosting quotas page consulted does not list that quota. I replaced the claim with a general note about custom rule field length limits and checking current account quotas.

## Review Notes
The JSON code blocks were parsed successfully after the fixes. Ruby was not installed in the local environment, so I could not run a Ruby YAML parse check; the CloudFormation YAML snippet was reviewed manually for scalar quoting and structure.
