# Validation Summary: How to Use AWS Service Catalog AppRegistry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Service Catalog AppRegistry
- AWS CLI
- AWS CloudFormation
- AWS Lambda
- Amazon DynamoDB
- AWS Cost Explorer and cost allocation tags
- AWS Resource Access Manager

## Sources Consulted
- AWS Service Catalog AppRegistry key concepts: https://docs.aws.amazon.com/servicecatalog/latest/arguide/overview-appreg.html
- AWS Service Catalog AppRegistry managing application resources: https://docs.aws.amazon.com/servicecatalog/latest/arguide/associate-resource.html
- AWS CLI `servicecatalog-appregistry associate-resource`: https://docs.aws.amazon.com/cli/latest/reference/servicecatalog-appregistry/associate-resource.html
- AWS CLI `servicecatalog-appregistry sync-resource`: https://docs.aws.amazon.com/cli/latest/reference/servicecatalog-appregistry/sync-resource.html
- AWS Service Catalog AppRegistry `awsApplication` tag: https://docs.aws.amazon.com/servicecatalog/latest/arguide/ar-user-tags.html
- AWS Billing cost allocation tags and `awsApplication`: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html
- CloudFormation `AWS::ServiceCatalogAppRegistry::Application`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-servicecatalogappregistry-application.html
- CloudFormation `AWS::ServiceCatalogAppRegistry::AttributeGroup`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-servicecatalogappregistry-attributegroup.html
- CloudFormation `AWS::ServiceCatalogAppRegistry::AttributeGroupAssociation`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-servicecatalogappregistry-attributegroupassociation.html
- CloudFormation `AWS::ServiceCatalogAppRegistry::ResourceAssociation`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-servicecatalogappregistry-resourceassociation.html
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Service Catalog AppRegistry sharing resources: https://docs.aws.amazon.com/servicecatalog/latest/arguide/sharing-definitions.html
- AWS Service Catalog AppRegistry resource sharing with AWS RAM: https://docs.aws.amazon.com/servicecatalog/latest/arguide/share-ram.html

## Issues Found
- The post described AppRegistry as grouping related applications together. AppRegistry groups resources and metadata into applications and supports sharing applications, so the bullet was corrected.
- The prerequisites only mentioned `servicecatalog:*` and `cloudformation:*`. Applying the `awsApplication` tag through AppRegistry also requires tagging-related permissions, so the prerequisite was clarified.
- The CLI stack association examples omitted `--options APPLY_APPLICATION_TAG`, which is required when using `AssociateResource` to apply the `awsApplication` tag through the API/CLI. The option was added.
- The Lambda example used `nodejs20.x`, which is deprecated as of April 30, 2026 according to AWS Lambda runtime documentation. It was updated to `nodejs24.x`.
- The Cost Explorer section incorrectly used `sync-resource` as the way to enable application tag propagation. AWS documents `sync-resource` as syncing AppRegistry system tags, while `AssociateResource` with `APPLY_APPLICATION_TAG` applies the `awsApplication` tag. The section was corrected.
- The cross-account AWS RAM example used an invalid AppRegistry application ARN shape. It was changed to the documented `arn:aws:servicecatalog:region:account:/applications/application-id` format.
- The cross-account section implied any target account can associate stacks after sharing. AWS RAM shares can be read-only or allow associations, so the text now states that association permissions are required.

## Review Notes
The CloudFormation AppRegistry resource types and CLI commands are current. The post could later mention tag-sync tasks for bulk onboarding tagged resources, but that is an enhancement rather than a correctness issue.
