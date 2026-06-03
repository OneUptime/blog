# Validation Summary: How to Containerize Legacy Applications for AWS

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS ECS
- AWS Fargate
- Amazon EFS
- Amazon S3 Files
- Amazon ECR
- AWS Secrets Manager
- Docker and Dockerfiles
- PHP Apache Docker image
- Apache Tomcat Docker image
- Java on containers
- Python Docker images
- Linux process and package inspection commands
- ElastiCache Redis

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- PHP Docker Official Image documentation: https://hub.docker.com/_/php/
- Python Docker Official Image documentation: https://hub.docker.com/_/python/
- Tomcat Docker Official Image documentation: https://hub.docker.com/_/tomcat/
- PHP supported versions: https://www.php.net/supported-versions.php
- CentOS Linux lifecycle: https://www.centos.org/centos-linux/
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS container health checks: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Boto3 ECS register_task_definition reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ecs/client/register_task_definition.html
- Amazon ECS EFS volume configuration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html
- Amazon ECS S3 Files volume configuration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/s3files-volumes.html
- Linux pgrep and lsof local help output for command flags.

## Issues Found
- The process inspection examples used `ps aux | grep your-app` and passed raw `pgrep` output to `lsof` and `grep`. This is unreliable when multiple PIDs match. Changed the process listing to `pgrep -af your-app`, used `pgrep -d,` for the comma-separated PID list expected by `lsof -p`, and used a pipe-delimited PID pattern for the `ss` filter.
- The base image examples included `centos:7`, but CentOS Linux 7 reached end of life on June 30, 2024. Replaced it with `rockylinux:9` as a current RHEL-compatible example.
- The base image examples included `python:2.7-slim`, which is not a supported Python runtime. Replaced it with `python:3.12-slim` and changed the comment to recommend pinning a supported runtime where possible.
- The Ubuntu system dependency snippet used `wget` later but did not install it. Added `wget` to the package list.
- The PHP Dockerfile installed PHP extensions before installing required system libraries and used the end-of-life `php:7.4-apache` image. Updated the example to `php:8.4-apache`, installed the required Debian packages before running `docker-php-ext-install`, and added `curl` because the Docker `HEALTHCHECK` command depends on it.
- The Tomcat Dockerfile used `curl` in its `HEALTHCHECK` without installing `curl`. Added an installation step before the health check.
- The configuration templating Dockerfile used `envsubst` without installing the package that provides it on Debian/Ubuntu images. Added `gettext-base`.
- The ECR image and IAM/Secrets Manager ARN examples used a 9-digit account placeholder. Replaced them with 12-digit AWS account placeholders.
- The storage guidance mentioned S3 via `s3fs`. For ECS Fargate, the documented S3-backed file volume path is Amazon S3 Files with `s3filesVolumeConfiguration`. Updated the wording to Amazon S3 Files.

## Review Notes
- The post remains a high-level modernization guide; the snippets are representative and still require adaptation for each legacy application's actual runtime, package repositories, IAM policies, VPC networking, and application health endpoints.
- Ubuntu 18.04 and Ubuntu 20.04 examples are retained because legacy applications may require those environments, but production use should account for standard support status, extended support options, and image vulnerability scanning.
