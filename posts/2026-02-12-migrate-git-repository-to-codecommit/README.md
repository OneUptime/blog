# How to Migrate a Git Repository to CodeCommit

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeCommit, Git, Migration

Description: Step-by-step instructions for migrating Git repositories from GitHub, GitLab, or Bitbucket to AWS CodeCommit while preserving all branches, tags, and commit history.

---

Migrating a Git repository to CodeCommit is essentially a matter of cloning the full repository and pushing it to a new remote. The good news is that Git is designed for exactly this kind of operation - all your branches, tags, and commit history come along for the ride. The tricky parts are handling large repositories, managing authentication, and updating your team's workflows.

This guide covers the actual migration process, including edge cases like large files, submodules, and keeping repositories in sync during a transition period.

## Before You Start

Make sure you have:
- AWS CLI configured with credentials that have CodeCommit permissions
- Git credential helper set up (or HTTPS/SSH credentials ready)
- Access to the source repository (GitHub, GitLab, Bitbucket, or self-hosted)

Set up the credential helper if you haven't already.

```bash
# Configure Git to use AWS credential helper
git config --global credential.helper '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true
```

## Method 1: Full Mirror Clone (Recommended)

This is the cleanest method. A mirror clone copies everything - all branches, all tags, all refs.

```bash
# Step 1: Create the target repository in CodeCommit
aws codecommit create-repository \
  --repository-name my-application \
  --repository-description "Migrated from GitHub"

# Step 2: Clone the source repository as a bare mirror
git clone --mirror https://github.com/myorg/my-application.git my-application-mirror

# Step 3: Push the mirror to CodeCommit
cd my-application-mirror
git push --mirror https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application

# Step 4: Verify the migration
cd ..
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application my-application-verify
cd my-application-verify
git branch -a
git tag -l
git log --oneline -20
```

That's it for simple repositories. The mirror push sends everything in one go.

## Method 2: Migrating from GitHub with SSH

If you're using SSH for both source and destination:

```bash
# Clone from GitHub via SSH
git clone --mirror git@github.com:myorg/my-application.git my-application-mirror
cd my-application-mirror

# Push to CodeCommit via SSH
git remote set-url --push origin ssh://YOUR_SSH_KEY_ID@git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application
git push --mirror
```

## Method 3: Migrating from GitLab

GitLab repositories often have CI/CD configuration, wiki repos, and LFS objects. Handle each separately.

```bash
# Clone the main repository
git clone --mirror https://gitlab.com/myorg/my-application.git my-application-mirror

# Clone the wiki repository (if it exists)
git clone --mirror https://gitlab.com/myorg/my-application.wiki.git my-application-wiki-mirror

# Create both repos in CodeCommit
aws codecommit create-repository --repository-name my-application
aws codecommit create-repository --repository-name my-application-wiki

# Push both
cd my-application-mirror
git push --mirror https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application

cd ../my-application-wiki-mirror
git push --mirror https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application-wiki
```

## Handling Large Files and Git LFS

If your repository uses Git LFS, you need to handle LFS objects separately since CodeCommit doesn't support Git LFS natively.

```bash
# First, check if the repo uses LFS
cd my-application-mirror
git lfs ls-files

# If it does, convert LFS pointers back to actual files
git lfs fetch --all
git lfs uninstall

# Convert all LFS pointers to real files in history
# This rewrites history, so the commit hashes will change
git filter-repo --force --blob-callback '
  if blob.data.startswith(b"version https://git-lfs"):
    pass  # Handle LFS pointer conversion
'

# Alternative: just download LFS files and add them normally
git lfs pull
git lfs untrack "*"
git add -A
git commit -m "Convert LFS files to regular Git objects"
```

For repositories with very large files (over 6 MB individual files or over 2 GB total), you may hit CodeCommit limits. In that case, clean up large files before migrating.

```bash
# Find large files in repository history
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  sed -n 's/^blob //p' | \
  sort -rnk2 | \
  head -20

# Remove large files from history using git-filter-repo
pip install git-filter-repo

# Remove files larger than 50MB from history
git filter-repo --strip-blobs-bigger-than 50M
```

## Handling Submodules

If your repository has submodules pointing to external repos, update the submodule URLs.

```bash
# Check for submodules
cat .gitmodules

# Update submodule URLs to point to CodeCommit
# First, migrate each submodule repository to CodeCommit
# Then update .gitmodules
git config --file .gitmodules submodule.libs/shared.url https://git-codecommit.us-east-1.amazonaws.com/v1/repos/shared-lib
git add .gitmodules
git commit -m "Update submodule URLs for CodeCommit migration"
```

## Keeping Repositories in Sync During Transition

If you can't switch everyone over at once, keep both repositories in sync temporarily.

```bash
# Set up a sync script that runs periodically
cat > sync-repos.sh << 'BASH'
#!/bin/bash
# sync-repos.sh - Keep GitHub and CodeCommit in sync

REPO_DIR="/tmp/repo-sync"
GITHUB_URL="https://github.com/myorg/my-application.git"
CODECOMMIT_URL="https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application"

# Clone or update the mirror
if [ -d "$REPO_DIR" ]; then
  cd "$REPO_DIR"
  git fetch origin --prune
else
  git clone --mirror "$GITHUB_URL" "$REPO_DIR"
  cd "$REPO_DIR"
  git remote set-url --push origin "$CODECOMMIT_URL"
fi

# Push all refs to CodeCommit
git push --mirror

echo "Sync completed at $(date)"
BASH

chmod +x sync-repos.sh
```

You can run this on a schedule with cron or a Lambda function triggered by a CloudWatch Events rule.

## Migrating Multiple Repositories at Once

If you're moving an entire organization, script the batch migration.

```bash
#!/bin/bash
# batch-migrate.sh - Migrate multiple repos from GitHub to CodeCommit

GITHUB_ORG="myorg"
REGION="us-east-1"

# List of repositories to migrate
REPOS=(
  "my-application"
  "auth-service"
  "api-gateway"
  "frontend"
  "infrastructure"
)

for repo in "${REPOS[@]}"; do
  echo "=== Migrating $repo ==="

  # Create CodeCommit repository
  aws codecommit create-repository \
    --repository-name "$repo" \
    --repository-description "Migrated from GitHub/$GITHUB_ORG/$repo"

  # Clone and push
  git clone --mirror "https://github.com/$GITHUB_ORG/$repo.git" "/tmp/$repo-mirror"
  cd "/tmp/$repo-mirror"
  git push --mirror "https://git-codecommit.$REGION.amazonaws.com/v1/repos/$repo"

  # Cleanup
  cd /
  rm -rf "/tmp/$repo-mirror"

  echo "=== $repo migration complete ==="
done
```

## Post-Migration Verification

Always verify after migration.

```bash
# Compare branch counts
echo "Source branches:"
git ls-remote --heads https://github.com/myorg/my-application.git | wc -l

echo "CodeCommit branches:"
aws codecommit list-branches --repository-name my-application --query 'branches | length(@)'

# Compare tag counts
echo "Source tags:"
git ls-remote --tags https://github.com/myorg/my-application.git | wc -l

echo "CodeCommit tags:"
git ls-remote --tags https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application | wc -l

# Compare commit counts on main branch
echo "Source commits:"
git rev-list --count HEAD

echo "CodeCommit commits:"
cd /tmp && git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application verify-repo
cd verify-repo && git rev-list --count HEAD
```

## Update Your Team

After migration, your team needs to update their local repositories.

```bash
# For existing clones, just change the remote URL
git remote set-url origin https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application

# Verify the new remote
git remote -v

# Test with a fetch
git fetch origin
```

Send your team a message with the new clone URL and authentication setup instructions. If you're using the credential helper method, everyone needs to have the AWS CLI configured with appropriate credentials.

For setting up CI/CD after your migration, check out our guide on [creating CodeBuild projects](https://oneuptime.com/blog/post/create-aws-codebuild-projects/view) that integrates directly with CodeCommit.
