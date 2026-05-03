# Validation Summary: How to Deploy a Java Spring Boot Application with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS provider (`hashicorp/aws`)
- AWS ECS Fargate
- AWS ECR
- AWS RDS (PostgreSQL)
- AWS Application Load Balancer / Target Groups
- AWS Secrets Manager
- AWS CloudWatch Logs
- Java / JVM (container-aware flags)
- Spring Boot (Actuator health endpoint)

## Sources Consulted
- AWS provider `aws_db_instance` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp write-only arguments docs: https://developer.hashicorp.com/terraform/language/manage-sensitive-data/write-only
- AWS provider `aws_ecr_repository` and ECR image-tag mutability docs: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html
- AWS ECS `HealthCheck` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_HealthCheck.html
- Red Hat / OpenJDK container awareness write-up: https://developers.redhat.com/articles/2022/04/19/java-17-whats-new-openjdks-container-awareness
- Baeldung on `MaxRAMPercentage`: https://www.baeldung.com/java-jvm-parameters-rampercentage
- Spring Boot Actuator endpoints docs: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html

## Issues Found
No technical issues found.

All resource schemas (`aws_ecr_repository`, `aws_ecs_task_definition`, `aws_db_instance`, `aws_ecs_service`, `aws_lb_target_group`) match the current AWS provider documentation. The `password_wo` / `password_wo_version` write-only arguments on `aws_db_instance` are valid (AWS provider 5.83.x+, requires Terraform 1.11+ / OpenTofu 1.10+ for ephemeral/write-only support). The ECS `healthCheck` field names (`command`, `interval`, `timeout`, `retries`, `startPeriod`) are the correct camelCase keys for the JSON-encoded container definition. The Spring Boot Actuator default health path `/actuator/health` is correct, and `matcher = "200"` aligns with Actuator's default response code when the application is `UP`. The JVM flags `-XX:+UseContainerSupport` and `-XX:MaxRAMPercentage=75.0` are valid and behave as described.

## Review Notes
- **Redundant JVM heap settings (works, but inefficient):** The container `command` sets both `-Xmx1536m` and `-XX:MaxRAMPercentage=75.0`. When `-Xmx` is specified explicitly, the JVM ignores `MaxRAMPercentage`, so the percentage flag has no effect here. This is not a bug — the heap will still cap at 1536 MB (which is roughly 75% of the 2048 MB container) — but for cleaner container-aware behavior, picking only one (typically `MaxRAMPercentage` so the heap auto-tracks future container memory changes) is the more idiomatic approach.
- **`-XX:+UseContainerSupport` is on by default** since JDK 10 (and backported to 8u191), so on JDK 11/17/21 the flag is a no-op. Leaving it in is harmless and acts as documentation.
- **Spring Boot liveness/readiness probes:** The post uses the aggregate `/actuator/health` endpoint. For finer-grained ALB / ECS behavior, Spring Boot also exposes `/actuator/health/liveness` and `/actuator/health/readiness` (when `management.endpoint.health.probes.enabled=true` or running on Kubernetes). Not an issue, just a future enhancement.
- **`image_tag_mutability = "MUTABLE"`** is valid; ECR also supports `IMMUTABLE` (and the newer `IMMUTABLE_WITH_EXCLUSION`) if the team later wants to enforce immutable production tags.
