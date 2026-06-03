# Validation Summary: How to Use CodeArtifact with Maven (Java)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeArtifact
- AWS CLI
- Apache Maven
- Gradle
- Java
- AWS CodeBuild
- XML Maven settings and POM configuration
- YAML buildspec configuration

## Sources Consulted
- AWS CodeArtifact User Guide: Use CodeArtifact with mvn: https://docs.aws.amazon.com/codeartifact/latest/ug/maven-mvn.html
- AWS CodeArtifact User Guide: Use CodeArtifact with Gradle: https://docs.aws.amazon.com/codeartifact/latest/ug/maven-gradle.html
- AWS CodeArtifact User Guide: Authentication and tokens: https://docs.aws.amazon.com/codeartifact/latest/ug/tokens-authentication.html
- AWS CLI Command Reference: codeartifact list-packages: https://docs.aws.amazon.com/cli/latest/reference/codeartifact/list-packages.html
- AWS CodeBuild User Guide: Runtime versions: https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html
- Apache Maven Settings Reference: https://maven.apache.org/settings.html
- Apache Maven Guide: Using Mirrors for Repositories: https://maven.apache.org/guides/mini/guide-mirror-settings

## Issues Found
- The Maven `settings.xml` snippets used a `<mirrors>` section without defining a `<pluginRepositories>` entry. AWS CodeArtifact's Maven guidance states that when a `mirrors` element is added, a `pluginRepository` should also be present in `settings.xml` or the project POM. I added a CodeArtifact `pluginRepository` to the main settings snippet and to the CI-specific settings snippet so Maven plugins can resolve correctly.
- The package verification and troubleshooting AWS CLI examples omitted `--domain-owner` while the rest of the post consistently uses an explicit domain owner account ID. I added `--domain-owner 123456789012` to `list-packages`, `list-package-versions`, and `describe-repository` for consistency and cross-account correctness.

## Review Notes
Local AWS CLI help could not be checked because `aws` is not installed in the workspace. Commands and options were verified against the official AWS CLI and AWS CodeArtifact documentation instead. The Gradle repository and publishing snippets match AWS CodeArtifact's documented Gradle authentication pattern using `System.env.CODEARTIFACT_AUTH_TOKEN`. The CodeBuild `java: corretto17` runtime is still documented as a valid runtime, although availability depends on the selected CodeBuild image.
