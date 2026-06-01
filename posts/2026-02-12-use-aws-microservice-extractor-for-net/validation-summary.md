# Validation Summary: How to Use AWS Microservice Extractor for .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Microservice Extractor for .NET
- .NET Framework, .NET Core, and .NET 5.0 through .NET 7.0
- ASP.NET MVC
- Entity Framework Core
- ASP.NET Core dependency injection and typed HttpClient clients
- Amazon SNS and Amazon SQS
- AWS CloudFormation
- Amazon ECS and AWS Fargate
- AWS X-Ray

## Sources Consulted
- AWS Microservice Extractor for .NET User Guide: https://docs.aws.amazon.com/microservice-extractor/latest/userguide/what-is-microservice-extractor.html
- AWS Microservice Extractor supported use cases and versions: https://docs.aws.amazon.com/microservice-extractor/latest/userguide/microservice-extractor-supported-versions.html
- AWS Microservice Extractor prerequisites: https://docs.aws.amazon.com/microservice-extractor/latest/userguide/microservice-extractor-prerequisites.html
- AWS Microservice Extractor onboarding: https://docs.aws.amazon.com/microservice-extractor/latest/userguide/microservice-extractor-use-onboard.html
- AWS Microservice Extractor runtime profiling: https://docs.aws.amazon.com/microservice-extractor/latest/userguide/drfit-runtime-profiling.html
- AWS Microservice Extractor extraction workflow: https://docs.aws.amazon.com/microservice-extractor/latest/userguide/microservice-extractor-use-extract.html
- AWS Microservice Extractor manual deployment: https://docs.aws.amazon.com/microservice-extractor/latest/userguide/microservice-extractor-deploy.html
- AWS CloudFormation AWS::ECS::Service documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ecs-service.html
- AWS CloudFormation ECS NetworkConfiguration documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ecs-service-networkconfiguration.html
- Microsoft IHttpClientFactory documentation: https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory
- Microsoft HttpContent JSON extension documentation: https://learn.microsoft.com/en-us/dotnet/api/system.net.http.json.httpcontentjsonextensions
- AWS SDK for .NET SNS PublishRequest documentation: https://docs.aws.amazon.com/sdkfornet/v4/apidocs/items/SNS/TPublishRequest.html
- AWS SDK for .NET SNS MessageAttributeValue documentation: https://docs.aws.amazon.com/sdkfornet/v3/apidocs/items/SNS/TMessageAttributeValue.html

## Issues Found
- The post implied AWS Microservice Extractor for .NET was generally available to new users. AWS documentation now states that it is no longer open to new customers and that customers needed to sign up before November 7, 2025. Added a note near the introduction and updated prerequisites to reflect this.
- The supported version claim said ".NET Core/.NET 5+", which was too broad. Official documentation lists .NET Core 3.1 and .NET 5.0 through .NET 7.0 for visualization and extraction, with extraction only for ASP.NET MVC applications. Updated the support statement.
- The prerequisites suggested collecting runtime traces with Application Insights or X-Ray. AWS documentation describes Microservice Extractor's own runtime profiler producing a CSV file for call count data. Replaced the tracing-tool reference with the official runtime profiler.
- The extraction section claimed the tool generates interface definitions and HTTP client stubs. AWS documentation describes extracting separate solutions, remote endpoints or library extraction, and refactoring controller-level method calls where supported. Updated the wording and example output.
- The Entity Framework Core DbContext snippet referenced `Configuration` without defining it. Added constructor-injected `IConfiguration` fields and used `_configuration.GetConnectionString(...)`.
- The HTTP client example dereferenced a possibly null deserialized response. Updated the return statement to handle a null `AvailabilityResult`.
- The deployment section said to deploy with ECS Fargate or Lambda, while AWS Microservice Extractor deployment documentation describes containerizing extracted services, pushing to ECR, and deploying to ECS. Updated the wording.
- The ECS Fargate CloudFormation snippet omitted `NetworkConfiguration`. Added an `AwsvpcConfiguration` with subnets and a security group, which is required for practical Fargate service deployments using `awsvpc` networking.

## Review Notes
The remaining C# snippets are illustrative and omit surrounding types, usings, constructors, and dependency registration that a complete application would need. The post is now technically accurate at the level of the guide.
