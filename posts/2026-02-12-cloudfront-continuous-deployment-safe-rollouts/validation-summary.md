# Validation Summary: How to Use CloudFront Continuous Deployment for Safe Rollouts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront continuous deployment
- CloudFront staging distributions
- AWS CLI
- AWS CloudFormation
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon CloudFront Developer Guide: Use CloudFront continuous deployment to safely test CDN configuration changes: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/continuous-deployment.html
- Amazon CloudFront Developer Guide: CloudFront continuous deployment workflow: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/continuous-deployment-workflow.html
- Amazon CloudFront Developer Guide: Learn how continuous deployment works: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-continuous-deployment.html
- Amazon CloudFront Developer Guide: Work with a staging distribution and continuous deployment policy: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/working-with-staging-distribution-continuous-deployment-policy.html
- AWS CLI Command Reference: create-continuous-deployment-policy: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-continuous-deployment-policy.html
- AWS CLI Command Reference: copy-distribution: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/copy-distribution.html
- AWS CLI Command Reference: update-continuous-deployment-policy: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/update-continuous-deployment-policy.html
- AWS CLI Command Reference: update-distribution-with-staging-config: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/update-distribution-with-staging-config.html
- AWS CloudFormation Template Reference: AWS::CloudFront::ContinuousDeploymentPolicy: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-continuousdeploymentpolicy.html
- AWS CloudFormation Template Reference: AWS::CloudFront::ContinuousDeploymentPolicy ContinuousDeploymentPolicyConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-continuousdeploymentpolicy-continuousdeploymentpolicyconfig.html
- AWS CloudFormation Template Reference: AWS::CloudFront::Distribution DistributionConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-distributionconfig.html

## Issues Found
- The post said both distributions share the same domain name and origin. Updated this to clarify that viewers keep using the production domain, the staging distribution has its own CloudFront DNS name and separate cache, and origins can differ when testing origin changes.
- The staging distribution creation example used `create-distribution-with-tags` from a modified production config. Updated it to use `copy-distribution`, which is the documented AWS CLI workflow for creating a CloudFront staging distribution, followed by `update-distribution` for staging changes.
- The post said the staging distribution config should include the continuous deployment policy ID. Corrected this to say the policy is attached to the primary distribution.
- The CloudFormation example used the AWS API shape for `StagingDistributionDnsNames` (`Items` and `Quantity`) instead of the CloudFormation array schema. Updated it to the CloudFormation form.
- The CloudFormation example attached `ContinuousDeploymentPolicyId` to the staging distribution. Moved it to the primary distribution.
- The testing section implied that the `aws-cf-cd-staging` header works for any policy. Clarified that header testing applies when using a header-based policy.
- The rollout progression included 50% weight-based traffic, but CloudFront continuous deployment weights are limited to 15%. Updated the example progression and noted the 15% maximum.
- The promotion section described the operation as atomic with no edge-location gap. Replaced that with the documented behavior: CloudFront copies the staging configuration to the primary distribution, disables the continuous deployment policy, and routes all traffic to the primary distribution.

## Review Notes
The AWS CLI examples still use placeholder distribution IDs and ETags, so they require substitution before use. The CloudFormation snippet remains illustrative; in production, teams should account for resource creation order and the fact that AWS's documented CLI workflow creates staging distributions by copying an existing primary distribution.
