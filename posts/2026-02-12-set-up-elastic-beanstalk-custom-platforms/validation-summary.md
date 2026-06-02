# Validation Summary: How to Set Up Elastic Beanstalk Custom Platforms

## Status
validated

## Post Type
Tutorial / legacy technical guide

## Technologies Covered
- AWS Elastic Beanstalk
- Elastic Beanstalk custom platforms
- EB CLI
- Packer `amazon-ebs` builder
- Ubuntu 16.04 custom platform flavor
- Bash deployment scripts
- systemd services
- Nginx
- Rust / rustup

## Sources Consulted
- AWS Elastic Beanstalk custom platforms documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/custom-platforms.html
- AWS Elastic Beanstalk `eb platform` CLI documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-platform.html
- AWS Elastic Beanstalk `eb create` CLI documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-create.html
- AWS Elastic Beanstalk `eb upgrade` CLI documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-upgrade.html
- AWS Elastic Beanstalk platform hooks documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.hooks.html
- HashiCorp Packer `amazon-ebs` builder documentation: https://developer.hashicorp.com/packer/plugins/builders/amazon/ebs
- Rustup installation documentation: https://rust-lang.github.io/rustup/installation/
- OneUptime Docker Elastic Beanstalk guide link target: https://oneuptime.com/blog/post/2026-02-12-deploy-docker-app-with-elastic-beanstalk/view

## Issues Found
- The post presented Elastic Beanstalk custom platforms as a current best-fit workflow. AWS now labels custom platforms as retired, so I updated the description, introduction, comparison guidance, and wrap-up to frame the workflow as legacy maintenance and recommend Docker or custom AMIs on managed platforms for new work.
- The `platform.yaml` example used `flavor: amazon-linux-2023`, but AWS custom platform flavors only include legacy values such as `amazon`, `ubuntu1604`, `rhel7`, and `rhel6`; Amazon Linux 2 and later are not supported for this custom-platform hook model. I changed the example to `ubuntu1604` and aligned the metadata with Ubuntu 16.04.
- The project structure and `platform.yaml` did not match the AWS sample convention for the Packer template location. I changed the example to use `custom_platform.json` at the platform archive root.
- The Packer example used an incorrect `PLATFORM_VERSION` environment variable and Amazon Linux 2023 AMI filter. AWS documents `AWS_EB_PLATFORM_VERSION`, and Packer documents Canonical Ubuntu 16.04 AMI filtering with owner `099720109477`, so I updated those values and changed the SSH user to `ubuntu`.
- The setup script used Amazon Linux 2023 `dnf` package names while the supported example flavor is Ubuntu. I changed it to `apt-get`, Ubuntu package names, and Ubuntu ownership.
- The custom platform hook setup omitted the `enact` phase, even though AWS documents `pre`, `enact`, and `post` subfolders for `appdeploy`, `configdeploy`, and `restartappserver`. I added the `enact` directories and moved the main deploy script into `appdeploy/enact`.
- The health check script had a duplicate shebang. I removed the second shebang.
- The systemd service used the Amazon Linux `ec2-user` account while the corrected example uses Ubuntu. I changed the service user to `ubuntu` and made the Elastic Beanstalk environment file optional so the service can still load if the file is absent.
- The EB CLI commands used invalid `eb platform create my-custom-platform --version ...` syntax. AWS documents `eb platform init <platform>` followed by `eb platform create <version>`, so I corrected the build and update examples.
- The `eb upgrade --platform ...` example was invalid. AWS documents `eb upgrade [environment-name]` for upgrading to the latest version of the current platform, so I changed it to `eb upgrade production`.
- The custom platform ARN example used a short account ID and included the version in the ARN while also using platform selection syntax inconsistently. I changed it to a 12-digit account ID and used `-p <platform ARN> --version 1.0.0`, matching AWS's documented custom platform usage.

## Review Notes
The corrected article is still a legacy-maintenance guide. AWS custom platforms are retired and depend on old operating system flavors, so this should not be promoted as a recommended path for new Elastic Beanstalk applications.
