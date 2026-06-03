# Validation Summary: How to Deploy a Node.js App with Elastic Beanstalk

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Elastic Beanstalk
- EB CLI
- AWS CLI
- Node.js
- Express
- Nginx
- Amazon RDS for PostgreSQL
- AWS Certificate Manager
- Application Load Balancer
- GitHub Actions

## Sources Consulted
- AWS Elastic Beanstalk supported platforms: https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html
- AWS Elastic Beanstalk Node.js 18 retirement release note: https://docs.aws.amazon.com/elasticbeanstalk/latest/relnotes/release-2025-08-11-nodejs18-retire.html
- AWS Elastic Beanstalk Node.js dependencies and `engines`: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/nodejs-platform-dependencies.html
- AWS Elastic Beanstalk Node.js quickstart and default port behavior: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/nodejs-quickstart.html
- AWS Elastic Beanstalk reverse proxy configuration: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.proxy.html
- AWS Elastic Beanstalk general configuration options: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
- AWS Elastic Beanstalk Application Load Balancer configuration: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-alb.html
- AWS Elastic Beanstalk deployment policies: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html
- AWS Elastic Beanstalk rolling configuration updates: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rollingupdates.html
- EB CLI `eb init` reference: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-init.html
- EB CLI `eb create` reference: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-create.html
- EB CLI `eb deploy` reference: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-deploy.html
- EB CLI `eb events` reference: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-events.html
- EB CLI `eb logs` reference: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-logs.html
- AWS Elastic Beanstalk environment variables and RDS integration: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-softwaresettings.html
- AWS Elastic Beanstalk platform script tools showing RDS environment variables: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/custom-platforms-scripts.html
- GitHub `actions/setup-node` documentation: https://github.com/actions/setup-node
- `einaregilsson/beanstalk-deploy` action documentation: https://github.com/einaregilsson/beanstalk-deploy

## Issues Found
- Node.js 18 is retired for Elastic Beanstalk as of August 11, 2025. Updated the tutorial to use Node.js 22 in `package.json`, `eb init`, and GitHub Actions.
- The `.ebextensions` example used the legacy `aws:elasticbeanstalk:container:nodejs` `NodeCommand` setting, which is not appropriate for current AL2023 Node.js platform branches. Removed it and kept startup control in the `Procfile`.
- The project structure and config filename referenced `01-nodecommand.config` after removing `NodeCommand`. Renamed it to `01-environment.config`.
- The `eb create` command used `--instance-type`; the official EB CLI reference documents `--instance_type`. Updated the command.
- The database code imported `pg` but `pg` was missing from `package.json`. Added it to dependencies.
- The RDS creation command did not enable a coupled database. Added `HasCoupledDatabase: true` and an explicit `DBUser`.
- The database example used only Elastic Beanstalk-created RDS variables, while the production external RDS example set `DB_*` variables. Updated the code to support both variable sets.
- The intro stated zero-downtime deployments were available out of the box. Adjusted the claim to configurable deployment strategies, because deployment policy depends on environment creation and configuration.
- The rolling update configuration enabled rolling updates without an explicit update type. Added `RollingUpdateType: Health`.

## Review Notes
The GitHub Actions deployment example uses a third-party action, not an official AWS action. Its input names match the action documentation, but future updates could change its recommended version or credential pattern.
