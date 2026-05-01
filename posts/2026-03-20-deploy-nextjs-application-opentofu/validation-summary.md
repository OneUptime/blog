# Validation Summary: How to Deploy a Next.js Application with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Next.js
- OpenTofu / Terraform-style HCL
- AWS CloudFront
- AWS ECS Fargate
- AWS S3
- AWS Secrets Manager
- AWS Application Load Balancer

## Sources Consulted
- Next.js `output: 'standalone'` documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Next.js self-hosting guide: https://nextjs.org/docs/app/guides/self-hosting
- Next.js `public` folder documentation: https://nextjs.org/docs/pages/api-reference/file-conventions/public-folder
- AWS CloudFront OAC with S3 origin: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFront managed origin request policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- AWS CloudFront managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront cache policy behavior: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html
- AWS CloudFront default root object behavior: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CreateDistribution.html
- AWS ECS task definitions: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html
- AWS ECS container health checks: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- AWS ECS Secrets Manager environment variable injection: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Terraform AWS provider `aws_cloudfront_distribution` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- Terraform AWS provider `aws_cloudfront_cache_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_cache_policy.html.markdown
- Terraform AWS provider `aws_cloudfront_origin_access_control` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_origin_access_control.html.markdown
- Terraform AWS provider `aws_ecs_task_definition` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_task_definition.html.markdown

## Issues Found
- The description claimed the guide supported both static export and SSR, but the content only documents a standalone Next.js server with CloudFront and S3 offload. I corrected the description to match the actual architecture.
- The introduction described "serverless" as a deployment mode and implied ISR works transparently on ECS Fargate. I updated this to match current Next.js self-hosting guidance and clarified that multi-instance ISR needs a shared or persistent cache.
- The architecture diagram routed `/static/*` to S3. Current Next.js documentation serves `public` assets from the site root, not a generic `/static/*` path, so I removed that incorrect route.
- The S3 example created an origin access control but omitted the bucket policy required for CloudFront to read the bucket through OAC. I added the missing `aws_s3_bucket_policy`.
- The ECS comments said standalone mode is built and run with `next start`. Next.js standalone output is started with `node .next/standalone/server.js`, so I corrected the runtime note.
- The CloudFront default origin request policy used `AllViewerExceptHostHeader`, which AWS documents as intended for API Gateway and Lambda function URL origins. I changed it to `AllViewer` so the ALB-backed Next.js origin receives the original viewer request values, including `Host`.
- The static asset cache behavior used deprecated `forwarded_values`-based configuration. I replaced it with the current `aws_cloudfront_cache_policy` resource and attached that policy to the `/_next/static/*` behavior.
- The `geo_restriction` block omitted `locations`, but the current AWS provider documentation still requires it. I added `locations = []` for `restriction_type = "none"`.

## Review Notes
- The post now accurately reflects that only `/_next/static/*` assets are offloaded to S3 in this architecture. `public` assets remain on the Next.js origin unless they are separately published and routed.
- The ECS health check uses `curl`, which must exist in the final container image. If the final image is a minimal Node runtime without `curl`, that command will need to be adjusted.
