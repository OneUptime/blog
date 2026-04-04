#!/bin/bash
set -e

cd ~/.openclaw/workspace-jamie/blog-repo

# Step 1: Ensure we're on master and up to date
git stash
git checkout master
git pull origin master

# Step 2: Create branch
git checkout -b blog/10-best-pingdom-alternatives-in-2026

# Step 3: Restore our changes
git stash pop

# Step 4: Generate social image
npm run generate-social-image -- posts/2026-04-02-10-best-pingdom-alternatives-in-2026

# Step 5: Validate
npm run validate

# Step 6: Commit and push
git add .
git commit -m "Add blog: 10 Best Pingdom Alternatives in 2026"
git push origin blog/10-best-pingdom-alternatives-in-2026

# Step 7: Create PR
GITHUB_TOKEN=$(node -e "console.log(require('/home/simon-larsen/.openclaw/workspace-jamie/.credentials/services.json').github.pat)")
curl -s -X POST "https://api.github.com/repos/OneUptime/blog/pulls" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add blog: 10 Best Pingdom Alternatives in 2026",
    "body": "Comparison post covering 10 Pingdom alternatives for 2026. Covers pricing, features, and use cases for each tool. Targets high-value comparison keyword.",
    "head": "blog/10-best-pingdom-alternatives-in-2026",
    "base": "master"
  }'

# Step 8: Check for conflicts
git fetch origin
git merge origin/master --no-edit || true

echo ""
echo "Done! Check PR output above for URL."
