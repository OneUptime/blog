# Validation Summary: How to Use AWS App2Container for Containerizing Java/.NET Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS App2Container
- Docker
- Java
- .NET and ASP.NET
- IIS
- Amazon ECS
- Amazon EKS
- Amazon ECR
- AWS CloudFormation
- AWS CodePipeline
- AWS CodeCommit

## Sources Consulted
- AWS App2Container documentation: https://docs.aws.amazon.com/app2container/
- AWS App2Container supported applications: https://docs.aws.amazon.com/app2container/latest/UserGuide/supported-applications.html
- AWS App2Container compatibility: https://docs.aws.amazon.com/app2container/latest/UserGuide/compatibility-a2c.html
- AWS App2Container getting started and installation guide: https://docs.aws.amazon.com/app2container/latest/UserGuide/start-intro.html
- AWS App2Container command reference: https://docs.aws.amazon.com/app2container/latest/UserGuide/a2c-commands.html
- AWS App2Container init command: https://docs.aws.amazon.com/app2container/latest/UserGuide/cmd-init.html
- AWS App2Container analyze command: https://docs.aws.amazon.com/app2container/latest/UserGuide/cmd-analyze.html
- AWS App2Container containerize command: https://docs.aws.amazon.com/app2container/latest/UserGuide/cmd-containerize.html
- AWS App2Container generate app-deployment command: https://docs.aws.amazon.com/app2container/latest/UserGuide/cmd-generate-appdeploy.html
- AWS App2Container generate pipeline command: https://docs.aws.amazon.com/app2container/latest/UserGuide/cmd-generate-pipeline.html
- AWS App2Container container configuration: https://docs.aws.amazon.com/app2container/latest/UserGuide/config-containers.html
- AWS App2Container pipeline configuration: https://docs.aws.amazon.com/app2container/latest/UserGuide/config-pipeline.html
- AWS App2Container product page: https://aws.amazon.com/app2container/

## Issues Found
- The post did not mention that AWS App2Container is no longer open to new customers after November 7, 2025. Added a short availability note near the introduction so the 2026 tutorial does not imply new AWS customers can onboard normally.
- The supported applications list was incomplete and partly outdated. Updated it to reflect current AWS documentation: Java on JDK 1.8 or later with Tomcat, TomEE, JBoss standalone mode, and process-mode Java applications; .NET Core 3.1 and .NET 5 through .NET 9 on Linux; and .NET Framework 3.5 or 4.x on IIS 7.5+ for Windows.
- The operating system support list omitted specific supported versions. Updated the list to Amazon Linux 2, Amazon Linux 2023, Ubuntu 18.04+, RHEL 7+, CentOS 8+, and Windows Server 2016+.
- The init section presented `/root/app2container/config.json` and internal-looking JSON fields as a documented file contract. AWS documents the prompts and saved local configuration, but not that path or schema as a supported interface. Reworded the example to describe initialization values instead.
- The sample `analysis.json` used deployment-oriented fields such as `deployTarget`, `ecsParameters`, `cpu`, `memory`, and `desiredCount`. AWS documents those deployment settings as generated later in `deployment.json`, while `analysis.json` contains container settings such as `applicationPort`, `applicationMode`, include/exclude files, logging, and dependencies. Updated the sample and surrounding explanation.
- The sample Dockerfile used a `curl` health check without installing `curl`. Added `curl` to the package installation line.
- The CI/CD example used `--pipeline-type CodePipeline`, which is not a supported option for `app2container generate pipeline`. Removed that flag and clarified that pipeline type/source settings come from `pipeline.json`.

## Review Notes
The remaining App2Container commands, installation URLs, deployment command syntax, and high-level workflow match current AWS documentation for existing App2Container customers. Future updates should consider replacing App2Container with AWS Transform or another migration path for new customers because AWS has closed App2Container to new customer onboarding.
