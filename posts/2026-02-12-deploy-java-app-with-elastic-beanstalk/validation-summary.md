# Validation Summary: How to Deploy a Java App with Elastic Beanstalk

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Elastic Beanstalk
- EB CLI
- AWS CLI
- Java 17 and Java 21
- Amazon Corretto
- Spring Boot
- Spring Boot Actuator
- Maven
- Tomcat
- Logback
- PostgreSQL / Spring DataSource configuration
- Elastic Beanstalk `.ebextensions` and `.ebignore`

## Sources Consulted
- AWS Elastic Beanstalk Java quickstart: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/java-quickstart.html
- AWS Elastic Beanstalk Java SE Procfile documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/java-se-procfile.html
- AWS Elastic Beanstalk EB CLI configuration documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-configuration.html
- AWS Elastic Beanstalk EB CLI `eb init` documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-init.html
- AWS Elastic Beanstalk EB CLI `eb create` documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-create.html
- AWS Elastic Beanstalk general configuration options: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
- AWS Elastic Beanstalk supported platforms: https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html
- AWS Elastic Beanstalk reverse proxy configuration: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.proxy.html
- Spring Boot externalized configuration reference: https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html
- Spring Boot properties and configuration how-to: https://docs.spring.io/spring-boot/how-to/properties-and-configuration.html

## Issues Found
- The first Java example used `Map<String, String>` and `Map.of(...)` without importing `java.util.Map`. Added the missing import so the sample compiles.
- The EB CLI deployment section described `eb deploy --staged` as deploying a specific JAR directly. AWS documents `deploy.artifact` in `.elasticbeanstalk/config.yml` as the way to deploy a generated artifact, with `--staged` used when the configured artifact is not committed to Git. Reworded and reordered the snippet to reflect that behavior.
- The `.ebignore` example excluded `target/` and then attempted to re-include `!target/*.jar`. Because `.ebignore` follows `.gitignore`-style behavior, excluding the directory prevents reliable re-inclusion of files inside it. Changed the pattern to `target/*` followed by `!target/*.jar`.

## Review Notes
- EB CLI was not installed in the local environment, so CLI command validation was performed against official AWS EB CLI documentation.
- The post's platform references are current as of 2026-06-03: Elastic Beanstalk supports Java SE Corretto 17/21 and Tomcat platforms with Corretto 17/21 on Amazon Linux 2023.
- The single-instance example is technically valid, but AWS notes that `--single` environments are intended for development, testing, or staging rather than production.
