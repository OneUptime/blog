# Validation Summary: How to Set Up a Jenkins Server on EC2

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- AWS EC2
- Amazon Linux 2023
- Jenkins
- Jenkins Pipeline / Jenkinsfile
- Nginx reverse proxy
- Certbot / Let's Encrypt
- Docker
- AWS CLI / Amazon ECR / Amazon S3
- Jenkins plugins

## Sources Consulted
- Jenkins Linux installation documentation: https://www.jenkins.io/doc/book/installing/linux/
- Jenkins Nginx reverse proxy documentation: https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/reverse-proxy-configuration-nginx/
- Jenkins CLI documentation: https://www.jenkins.io/doc/book/managing/cli/
- Jenkins plugin management documentation: https://www.jenkins.io/doc/book/managing/plugins/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Docker Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Blue Ocean documentation: https://www.jenkins.io/doc/book/blueocean/
- Jenkins remoting CLI removal notice: https://www.jenkins.io/blog/2019/02/17/remoting-cli-removed/
- Amazon Corretto 21 installation documentation for Amazon Linux 2023: https://docs.aws.amazon.com/corretto/latest/corretto-21-ug/amazon-linux-install.html
- AWS CLI authorize-security-group-ingress documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon Linux 2023 container/package documentation: https://docs.aws.amazon.com/linux/al2023/ug/container.html
- Amazon ECS guide covering Docker on Amazon Linux 2023 EC2 instances: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-container-image.html
- Certbot Nginx instructions: https://certbot.eff.org/instructions
- Docker push command reference: https://docs.docker.com/engine/reference/commandline/image_push/
- Jenkins Slack plugin documentation: https://plugins.jenkins.io/slack
- Jenkins Pipeline: AWS Steps plugin documentation: https://plugins.jenkins.io/pipeline-aws/
- Jenkins Credentials Binding plugin documentation: https://plugins.jenkins.io/credentials-binding

## Issues Found
- The Jenkins RPM repository and GPG key URLs used the older `redhat-stable` path. Updated them to the current official `rpm-stable` repository and key URLs from Jenkins Linux installation documentation.
- The installation section used Java 17, while current Jenkins Linux installation documentation lists Java 21 or later. Updated the Amazon Linux 2023 package to Amazon Corretto 21 and added the `fontconfig` dependency listed in the Jenkins RPM install instructions.
- The Nginx and systemd override examples used `sudo cat > file`, which would not write to root-owned paths because shell redirection happens before `sudo` applies. Changed those examples to `sudo tee ... > /dev/null`.
- The Nginx WebSocket proxy header used `Connection "upgrade"` unconditionally. Updated it to use a documented `$connection_upgrade` map so normal non-WebSocket requests use the correct connection behavior.
- The Certbot/Nginx sequence created an SSL Nginx config referencing certificate files before obtaining those files. Changed the flow to obtain the certificate first with standalone Certbot using renewal hooks that stop and restart Nginx, then write and start the SSL Nginx configuration.
- The Jenkins CLI example referenced `/var/lib/jenkins/jenkins-cli.jar`, which is not the documented way to obtain the CLI client. Added a download from `/jnlpJars/jenkins-cli.jar` and then invoked the local jar.
- The example Jenkinsfile used `when { branch 'develop' }`, which is documented for Multibranch Pipelines. Clarified that the Jenkinsfile is for a Multibranch Pipeline.
- The security section recommended disabling Jenkins CLI over remoting, but remoting CLI mode was removed from Jenkins in 2019. Replaced that with current CLI transport guidance.

## Review Notes
- Blue Ocean is still usable but Jenkins documentation says it will be deprecated in July 2026 and recommends Pipeline Graph View or Stage View for maintained visualization. The post's Blue Ocean mention is not technically false today, but it may need a future update.
- The AWS monthly instance costs are approximate and region-dependent. The listed estimates are plausible for common Linux on-demand pricing, but production cost guidance should ideally name a region and pricing basis.
- The Jenkins CLI install-plugin example may require authentication depending on the Jenkins security configuration.
