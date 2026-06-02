# Validation Summary: How to Set Up Elastic Beanstalk for Web Application Deployment

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Elastic Beanstalk
- AWS CLI
- EB CLI
- Amazon EC2
- Elastic Load Balancing / Application Load Balancer
- Amazon EC2 Auto Scaling
- Amazon CloudWatch
- Node.js
- Express
- `.ebextensions`
- AWS Certificate Manager

## Sources Consulted
- AWS Elastic Beanstalk supported platforms: https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html
- AWS Elastic Beanstalk Node.js platform history: https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platform-history-nodejs.html
- AWS Elastic Beanstalk `eb create` command reference: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-create.html
- AWS Elastic Beanstalk general configuration options: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
- AWS Elastic Beanstalk auto scaling triggers: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-autoscaling-triggers.html
- AWS Elastic Beanstalk `.ebextensions` configuration files: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/ebextensions.html
- AWS Elastic Beanstalk HTTPS termination at the load balancer: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/configuring-https-elb.html
- AWS Elastic Beanstalk deployment policies and settings: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html
- AWS CLI `create-application-version` reference: https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/create-application-version.html
- AWS CLI `describe-environment-health` reference: https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/describe-environment-health.html
- AWS Elastic Beanstalk Node.js quickstart: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/nodejs-quickstart.html

## Issues Found
- The `create-environment` example used the outdated solution stack `64bit Amazon Linux 2023 v6.1.0 running Node.js 18`. Updated it to the current Node.js 22 AL2023 solution stack available on June 2, 2026: `64bit Amazon Linux 2023 v6.11.1 running Node.js 22`.
- The EB CLI example used `--instance-type`, but the official EB CLI command reference documents the single On-Demand instance type option as `--instance_type`. Updated the command accordingly.
- The CPU-based Auto Scaling trigger set `MeasureName` to `CPUUtilization` but did not set `Unit`. Since the trigger namespace defaults `Unit` to `Bytes`, the example could create a mismatched CloudWatch alarm for a percentage metric. Added `Unit` with value `Percent`.

## Review Notes
- The `describe-environment-health` command requires Elastic Beanstalk enhanced health reporting. This is commonly enabled by the console and EB CLI recommended settings, but AWS documents it as a requirement for that API.
- Node.js 20 is still listed as supported but is scheduled for retirement in 2026, so the examples now use Node.js 22.
