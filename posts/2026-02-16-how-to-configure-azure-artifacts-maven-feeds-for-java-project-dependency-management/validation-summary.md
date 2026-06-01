# Validation Summary: How to Configure Azure Artifacts Maven Feeds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Artifacts Maven feeds
- Azure DevOps
- Azure Pipelines
- Apache Maven
- Gradle
- Java package publishing and dependency management
- Azure DevOps Artifacts REST API

## Sources Consulted
- Microsoft Learn: Connect to an Azure Artifacts feed - Maven: https://learn.microsoft.com/en-us/azure/devops/artifacts/maven/project-setup-maven
- Microsoft Learn: Connect to an Azure Artifacts feed - Gradle: https://learn.microsoft.com/en-us/azure/devops/artifacts/maven/project-setup-gradle
- Microsoft Learn: MavenAuthenticate@0 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/maven-authenticate-v0
- Microsoft Learn: Maven@4 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/maven-v4
- Microsoft Learn: Manage permissions - Azure Artifacts: https://learn.microsoft.com/en-us/azure/devops/artifacts/feeds/feed-permissions
- Microsoft Learn: Azure Artifacts key concepts: https://learn.microsoft.com/en-us/azure/devops/artifacts/artifacts-key-concepts
- Microsoft Learn: Delete and recover packages - Azure Artifacts: https://learn.microsoft.com/en-us/azure/devops/artifacts/how-to/delete-and-recover-packages
- Microsoft Learn: Maven Delete Package Version REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/artifactspackagetypes/maven/delete-package-version
- Apache Maven: Password Encryption: https://maven.apache.org/guides/mini/guide-encryption.html

## Issues Found
- Maven password encryption commands included secrets directly on the command line. Updated the commands to rely on Maven's password prompt and clarified that the encrypted master password output belongs in `~/.m2/settings-security.xml`.
- The version-management section said Azure Artifacts only prevents overwriting release versions and that SNAPSHOT versions can be overwritten. Azure Artifacts package versions are immutable; Maven snapshots are timestamped, and Azure Artifacts retains a limited number of snapshots. Updated the wording accordingly.
- The REST API delete example used `api-version=7.1` and omitted the project segment while the surrounding examples use a project-scoped feed. Updated the URL to include `myproject` and `api-version=7.1-preview.1`.
- The Gradle publishing snippet used `publishing` and `components.java` without applying the required Gradle plugins. Added `java-library` and `maven-publish`.
- The Azure Artifacts permission-role descriptions were inaccurate. Updated the role names and permissions to match Feed Reader, Feed and Upstream Reader (Collaborator), Feed Publisher (Contributor), and Feed Owner.
- The recommendation for developers and build service accounts used the Collaborator role for publishing. Updated it to Feed Publisher (Contributor) for identities that publish packages.

## Review Notes
The post is technically relevant and has been validated after the corrections above. The Maven and Azure Pipelines snippets use current task names and input values. The feed URL examples are plausible for project-scoped feeds; organization-scoped feeds should omit the project segment.
