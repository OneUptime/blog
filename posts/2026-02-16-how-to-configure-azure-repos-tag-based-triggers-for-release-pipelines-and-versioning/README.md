# How to Configure Azure Repos Tag-Based Triggers for Release Pipelines and Versioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Repos, Git Tags, Release Pipelines, Versioning, CI/CD, Azure Pipelines, Semantic Versioning

Description: Learn how to configure Azure Pipelines to trigger builds and releases based on Git tags for structured versioning and controlled release workflows.

---

Triggering builds on every commit works well for continuous integration, but releases need more structure. You do not want a production deployment every time someone pushes to main. Instead, you want releases tied to explicit version tags - a deliberate act that says "this commit is ready for release." Git tags give you that explicit release signal, and Azure Pipelines can trigger on them.

Tag-based triggers let you create a clean release workflow: developers work on main, and when the code is ready for release, someone tags the commit with a version number. That tag triggers the release pipeline, which builds, tests, packages, and deploys the tagged version.

## Basic Tag Trigger Configuration

In your YAML pipeline, the `trigger` section accepts a `tags` property that specifies which tags should trigger the pipeline.

```yaml
# azure-pipelines.yml - Trigger on version tags
# This pipeline only runs when a tag matching v* is pushed

trigger:
  tags:
    include:
      - v*          # Matches v1.0.0, v2.3.1, v0.1.0-beta, etc.
  branches:
    include:
      - none        # Do not trigger on branch pushes

pool:
  vmImage: 'ubuntu-latest'

steps:
  - script: |
      # Extract the version from the tag
      TAG_NAME=$(Build.SourceBranchName)
      echo "Building release for tag: $TAG_NAME"
      echo "Full ref: $(Build.SourceBranch)"
    displayName: 'Print release info'

  - task: DotNetCoreCLI@2
    displayName: 'Build Release'
    inputs:
      command: 'build'
      projects: '**/*.csproj'
      arguments: '--configuration Release'
```

When someone pushes a tag like `v1.2.0` to the repository, this pipeline triggers. The `Build.SourceBranch` variable contains `refs/tags/v1.2.0` and `Build.SourceBranchName` contains `v1.2.0`.

## Semantic Versioning with Tags

Most teams use semantic versioning (semver) for their tags. You can filter tags to match only valid semver patterns.

```yaml
# Trigger only on semantic version tags
trigger:
  tags:
    include:
      - 'v[0-9]+.[0-9]+.[0-9]+'     # Stable releases: v1.0.0, v2.3.1
      - 'v[0-9]+.[0-9]+.[0-9]+-*'    # Pre-releases: v1.0.0-beta.1, v2.0.0-rc.1
    exclude:
      - 'v*-draft*'                    # Exclude draft tags
  branches:
    include:
      - none
```

Then in your pipeline, parse the version number for use in packaging and deployment.

```yaml
steps:
  # Parse the semantic version from the tag
  - script: |
      # Get the tag name and strip the 'v' prefix
      TAG="$(Build.SourceBranchName)"
      VERSION="${TAG#v}"  # Remove leading 'v'

      # Split into components
      MAJOR=$(echo "$VERSION" | cut -d. -f1)
      MINOR=$(echo "$VERSION" | cut -d. -f2)
      PATCH=$(echo "$VERSION" | cut -d. -f3 | cut -d- -f1)
      PRERELEASE=$(echo "$VERSION" | grep -oP '(?<=-).+' || echo "")

      echo "Version: $VERSION"
      echo "Major: $MAJOR, Minor: $MINOR, Patch: $PATCH"
      echo "Pre-release: $PRERELEASE"

      # Set pipeline variables for use in later steps
      echo "##vso[task.setvariable variable=SemVer]$VERSION"
      echo "##vso[task.setvariable variable=IsPreRelease]$([ -n "$PRERELEASE" ] && echo true || echo false)"
      echo "##vso[build.updatebuildnumber]$VERSION"
    displayName: 'Parse version from tag'

  # Use the parsed version for NuGet packaging
  - task: DotNetCoreCLI@2
    displayName: 'Pack with version'
    inputs:
      command: 'pack'
      packagesToPack: '**/MyLibrary.csproj'
      versioningScheme: 'byEnvVar'
      versionEnvVar: 'SemVer'
```

## Creating Tags from the Command Line

Developers create tags using standard Git commands. Here is the typical workflow.

```bash
# Make sure you are on the commit you want to tag
git log --oneline -5

# Create an annotated tag (recommended over lightweight tags)
# Annotated tags include the tagger, date, and a message
git tag -a v1.2.0 -m "Release version 1.2.0 - Added user search feature"

# Push the tag to Azure Repos
git push origin v1.2.0

# To push all local tags at once
git push origin --tags
```

Annotated tags are preferred because they include metadata (who created the tag and when) and a message that can describe what is in the release.

## Multi-Stage Release Pipeline with Tags

Here is a complete pipeline that triggers on version tags and deploys through multiple stages with quality gates.

```yaml
# release-pipeline.yml - Full release pipeline triggered by version tags

trigger:
  tags:
    include:
      - 'v*'
  branches:
    include:
      - none

variables:
  - name: version
    value: $[ replace(variables['Build.SourceBranchName'], 'v', '') ]
  - name: isPreRelease
    value: $[ contains(variables['Build.SourceBranchName'], '-') ]

stages:
  # Stage 1: Build and package
  - stage: Build
    displayName: 'Build Release Package'
    jobs:
      - job: BuildJob
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - checkout: self
            fetchDepth: 0  # Full history needed for tag info

          - script: |
              echo "Building release $(version)"
              echo "Pre-release: $(isPreRelease)"
            displayName: 'Display version info'

          - task: DotNetCoreCLI@2
            displayName: 'Build'
            inputs:
              command: 'build'
              projects: '**/*.csproj'
              arguments: '--configuration Release /p:Version=$(version)'

          - task: DotNetCoreCLI@2
            displayName: 'Run tests'
            inputs:
              command: 'test'
              projects: '**/*Tests.csproj'
              arguments: '--configuration Release'

          - task: DotNetCoreCLI@2
            displayName: 'Pack NuGet'
            inputs:
              command: 'pack'
              packagesToPack: '**/MyLibrary.csproj'
              versioningScheme: 'byEnvVar'
              versionEnvVar: 'VERSION'

          - task: PublishBuildArtifacts@1
            displayName: 'Publish artifacts'
            inputs:
              pathToPublish: '$(Build.ArtifactStagingDirectory)'
              artifactName: 'release-package'

  # Stage 2: Publish to package feed
  - stage: PublishPackage
    dependsOn: Build
    displayName: 'Publish Package'
    jobs:
      - job: PublishJob
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: DownloadBuildArtifacts@1
            inputs:
              artifactName: 'release-package'

          - task: NuGetCommand@2
            displayName: 'Push to feed'
            inputs:
              command: 'push'
              publishVstsFeed: 'releases'

  # Stage 3: Deploy to staging (pre-releases go here only)
  - stage: DeployStaging
    dependsOn: PublishPackage
    displayName: 'Deploy to Staging'
    jobs:
      - deployment: StagingDeploy
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying $(version) to staging..."

  # Stage 4: Deploy to production (stable releases only)
  - stage: DeployProduction
    dependsOn: DeployStaging
    displayName: 'Deploy to Production'
    # Only deploy to production for stable releases (no pre-release suffix)
    condition: and(succeeded(), eq(variables['isPreRelease'], 'False'))
    jobs:
      - deployment: ProductionDeploy
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying $(version) to production..."
```

## Creating GitHub-Style Releases

If you want to create release notes alongside your tagged release, you can use the Azure DevOps REST API to create a release annotation.

```yaml
# Generate release notes from commits since last tag
steps:
  - checkout: self
    fetchDepth: 0  # Need full history for changelog

  - script: |
      # Find the previous tag
      CURRENT_TAG="$(Build.SourceBranchName)"
      PREVIOUS_TAG=$(git describe --tags --abbrev=0 "${CURRENT_TAG}^" 2>/dev/null || echo "")

      echo "Current: $CURRENT_TAG"
      echo "Previous: $PREVIOUS_TAG"

      # Generate changelog from commits between tags
      if [ -n "$PREVIOUS_TAG" ]; then
        echo "## Changes since $PREVIOUS_TAG" > CHANGELOG.md
        echo "" >> CHANGELOG.md
        git log "${PREVIOUS_TAG}..${CURRENT_TAG}" --pretty=format:"- %s (%h)" >> CHANGELOG.md
      else
        echo "## Initial Release" > CHANGELOG.md
        echo "" >> CHANGELOG.md
        git log --pretty=format:"- %s (%h)" >> CHANGELOG.md
      fi

      echo ""
      echo "Generated changelog:"
      cat CHANGELOG.md
    displayName: 'Generate release notes'

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: 'CHANGELOG.md'
      artifactName: 'release-notes'
```

## Automated Tag Creation in Pipelines

For teams that want fully automated version tagging, you can create tags from within a pipeline itself. This is common in gitflow-style workflows where merging to main automatically creates a release tag.

```yaml
# Auto-tag on merge to main
trigger:
  branches:
    include:
      - main

steps:
  - checkout: self
    persistCredentials: true  # Needed to push tags
    fetchDepth: 0

  - script: |
      # Determine the next version based on commit messages
      # This is a simplified example - real projects use tools like
      # conventional-commits or semantic-release

      # Get the latest tag
      LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
      echo "Latest tag: $LATEST_TAG"

      # Parse version components
      VERSION="${LATEST_TAG#v}"
      MAJOR=$(echo "$VERSION" | cut -d. -f1)
      MINOR=$(echo "$VERSION" | cut -d. -f2)
      PATCH=$(echo "$VERSION" | cut -d. -f3)

      # Increment patch version (simplistic - real logic would check commit messages)
      PATCH=$((PATCH + 1))
      NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"

      echo "New tag: $NEW_TAG"
      echo "##vso[task.setvariable variable=NewTag]$NEW_TAG"

      # Create and push the tag
      git tag -a "$NEW_TAG" -m "Automated release $NEW_TAG"
      git push origin "$NEW_TAG"
    displayName: 'Create version tag'
```

## Tag Policies and Protection

While Azure Repos does not have the same tag protection rules as GitHub, you can implement governance through branch policies and pipeline conditions.

Use naming conventions to differentiate authorized tags from ad-hoc ones. For example, only trigger release pipelines on tags that match `v[0-9]+.[0-9]+.[0-9]+` and ignore tags like `test-*` or `temp-*`.

You can also add a validation step that checks who created the tag and rejects builds from unauthorized users.

```yaml
steps:
  - script: |
      # Check who created the tag
      TAG_AUTHOR=$(git tag -l --format='%(taggeremail)' "$(Build.SourceBranchName)")
      echo "Tag created by: $TAG_AUTHOR"

      # Validate against allowed release managers
      ALLOWED_EMAILS="release-manager@company.com lead@company.com"
      if echo "$ALLOWED_EMAILS" | grep -qw "$TAG_AUTHOR"; then
        echo "Authorized release manager"
      else
        echo "##vso[task.logissue type=error]Unauthorized tag creator: $TAG_AUTHOR"
        exit 1
      fi
    displayName: 'Validate tag author'
```

Tag-based triggers bring structure and intentionality to your release process. Instead of every commit potentially becoming a release, only explicitly tagged commits enter the release pipeline. This gives teams control over what ships, when it ships, and makes it trivial to trace any deployed version back to the exact commit that produced it.
