# Validation Summary: How to Deploy a Spring Boot App to AWS

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Spring Boot
- Java 17
- AWS Elastic Beanstalk
- Amazon ECS Fargate
- Amazon ECR
- Amazon EC2
- Amazon RDS
- AWS CodeBuild and CodePipeline
- Amazon CloudWatch
- Micrometer
- Docker

## Sources Consulted
- Spring Boot Actuator metrics documentation: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Spring Cloud AWS CloudWatch metrics documentation: https://docs.awspring.io/spring-cloud-aws/docs/4.0.2/reference/html/index.html#cloudwatch-metrics
- Micrometer CloudWatch documentation: https://docs.micrometer.io/micrometer/reference/implementations/cloudwatch.html
- AWS Elastic Beanstalk Java SE Procfile documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/java-se-procfile.html
- AWS Elastic Beanstalk reverse proxy documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.proxy.html
- Amazon ECR CLI getting started documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html
- AWS CLI ECS register-task-definition documentation: https://docs.aws.amazon.com/cli/latest/reference/ecs/register-task-definition.html
- AWS CLI ECS create-service documentation: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ecs/create-service.html
- AWS CodeBuild runtime versions documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html

## Issues Found
- The Java health controller snippet omitted required imports. Added imports for `Instant`, `Map`, `HashMap`, `ResponseEntity`, `GetMapping`, and `RestController` so the snippet is syntactically complete.
- The ECS task definition used `curl` for the container health check, but the runtime image did not install `curl`. Added a minimal `apt-get install` step in the runtime Docker stage.
- The ECS service command said it created a service with a load balancer but did not pass `--load-balancers`. Added a target group mapping for the `spring-app` container on port 8080.
- The ECS task definition referenced a CloudWatch Logs group without creating it. Added an `aws logs create-log-group` command before task registration.
- The EC2 user-data script copied the JAR into `/opt/spring-app` without creating that directory. Added `mkdir -p /opt/spring-app`.
- The CloudWatch metrics snippet used the older Spring Boot 2 / Spring Cloud AWS 2 property prefix. Updated it to the current Spring Cloud AWS CloudWatch metrics properties: `management.cloudwatch.metrics.export.*` and `spring.cloud.aws.cloudwatch.enabled`.

## Review Notes
The examples still use placeholder values such as `ACCOUNT_ID`, `subnet-xxx`, `sg-xxx`, and a sample target group ARN; these must be replaced with real AWS resource IDs before execution. The Elastic Beanstalk example uses `--single`, which is valid for a simple environment but does not create the load-balanced/scaled environment discussed earlier in that section.
