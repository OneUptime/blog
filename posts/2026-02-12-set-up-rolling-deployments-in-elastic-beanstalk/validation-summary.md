# Validation Summary: How to Set Up Rolling Deployments in Elastic Beanstalk

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Elastic Beanstalk
- Elastic Beanstalk deployment policies
- Elastic Beanstalk configuration files
- EB CLI
- Elastic Load Balancing health checks
- Flask
- SQLAlchemy
- Bash platform hooks

## Sources Consulted
- AWS Elastic Beanstalk Developer Guide: Deployment policies and settings - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html
- AWS Elastic Beanstalk Developer Guide: General options for all environments - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
- AWS Elastic Beanstalk Developer Guide: Rolling environment configuration updates - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rollingupdates.html
- AWS Elastic Beanstalk Developer Guide: EB CLI `eb deploy` - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-deploy.html
- AWS Elastic Beanstalk Developer Guide: EB CLI `eb appversion` - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-appversion.html
- AWS Elastic Beanstalk Developer Guide: Platform hooks - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.hooks.html
- SQLAlchemy 2.0 documentation: Working with Engines and Connections - https://docs.sqlalchemy.org/20/core/connections.html

## Issues Found
- The description mentioned blue-green strategies even though the post covers Elastic Beanstalk deployment policies and traffic splitting, not blue-green deployment. Changed the description to reference traffic-splitting strategies.
- The rolling-with-additional-batch configuration included `aws:autoscaling:updatepolicy:rollingupdate` options, which are for rolling configuration updates rather than application deployment policy configuration. Removed that block from the deployment-policy example.
- The traffic-splitting explanation said the deployment continues with a full rolling update. AWS documents traffic splitting as launching a temporary Auto Scaling group, shifting traffic, attaching new instances to the original Auto Scaling group, and terminating old instances. Updated the explanation and added the Application Load Balancer requirement.
- The SQLAlchemy health-check example used `db.session.execute('SELECT 1')`. For current SQLAlchemy usage, textual SQL should be wrapped with `text()`. Added `from sqlalchemy import text` and changed the call to `db.session.execute(text('SELECT 1'))`.
- The EB CLI rollback example used `eb appversion --list`, but the EB CLI documentation does not list a `--list` option. The documented way to display versions is `eb appversion` with no options, so the command was corrected.

## Review Notes
The post is technically relevant and generally aligns with AWS Elastic Beanstalk's documented deployment policies. Platform hooks are documented for Amazon Linux 2 and later; older Amazon Linux AMI platform versions do not support `.platform/hooks`.
