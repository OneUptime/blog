# Validation Summary: How to Use AWS End-of-Support Migration Program

## Status
not-technically-relevant

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS End-of-Support Migration Program (EMP) for Windows Server
- AWS EMP Compatibility Package Builder
- Windows Server 2003, 2008, 2008 R2, 2019, and 2022
- Amazon EC2
- Amazon S3
- AWS Systems Manager Run Command
- Amazon CloudWatch Agent
- AWS CLI
- AWS Tools for Windows PowerShell

## Sources Consulted
- AWS EMP for Windows Server User Guide, document history and end-of-support notice: https://docs.aws.amazon.com/emp/latest/userguide/doc-history.html
- AWS EMP for Windows Server getting started guide: https://docs.aws.amazon.com/emp/latest/userguide/emp-getting-started.html
- AWS EMP application packaging model: https://docs.aws.amazon.com/emp/latest/userguide/emp-packaging-model.html
- AWS EMP standard packaging guide: https://docs.aws.amazon.com/emp/latest/userguide/emp-getting-started-packaging-media.html
- AWS EMP Guided Reverse Packaging guide: https://docs.aws.amazon.com/emp/latest/userguide/emp-getting-started-packaging-guided-reverse.html
- AWS EMP package contents reference: https://docs.aws.amazon.com/emp/latest/userguide/emp-package-contents.html
- AWS EMP deployment guide: https://docs.aws.amazon.com/emp/latest/userguide/emp-deploy.html
- AWS announcement for EMP self-service tooling: https://aws.amazon.com/about-aws/whats-new/2020/10/aws-end-of-support-migration-program-for-windows-server-now-available-as-a-self-serve-solution-for-customers/
- AWS CLI `ssm send-command` command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html
- Amazon CloudWatch Agent installation and configuration with Systems Manager: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/installing-cloudwatch-agent-ssm.html

## Issues Found
- AWS EMP for Windows Server is discontinued. The official AWS EMP documentation states that AWS discontinued support on April 30, 2025, and that after that date users can no longer use the tooling. Because this post is dated February 12, 2026 and presents EMP as a usable migration path, the core premise is no longer technically valid.
- The EMP command examples do not match the official EMP workflow or documented executable names. The post uses commands such as `emp-discovery.exe`, `emp-package.exe`, and `emp-deploy.exe`, but AWS documentation describes using the EMP QuickStart and Compatibility Package Builder UI for packaging, and `Compatibility.Package.Deployment.exe` for deployment.
- The packaging workflow is inaccurate. AWS documents standard packaging as an install-capture and runtime-analysis workflow, and Guided Reverse Packaging as a UI-driven workflow with dependency discovery. The post describes a separate discovery tool producing `dependencies.json` and a command-line package build process, which is not supported by the official documentation.
- The deployment examples are inaccurate for EMP packages. AWS documents deploying a package by running `<path-to-package>\Compatibility.Package.Deployment.exe /<switches>`, with examples such as `/acceptEULA`, `/deploydir`, and `/DeployAllRegistry`. The post instead shows installing a `.emp` file with `emp-deploy.exe`, which is not the documented package format or deployment command.

## Review Notes
The AWS CLI and Systems Manager concepts in the post are broadly plausible, but they do not make the EMP workflow correct or actionable. Since the official EMP tooling is no longer usable as of April 30, 2025, this post should be removed or replaced with a current migration/modernization guide rather than edited into a how-to.
