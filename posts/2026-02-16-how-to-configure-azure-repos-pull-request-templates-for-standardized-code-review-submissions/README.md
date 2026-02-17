# How to Configure Azure Repos Pull Request Templates for Standardized Code Review Submissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Repos, Pull Requests, Code Review, Templates, Azure DevOps, Developer Experience

Description: Set up pull request templates in Azure Repos to standardize code review submissions with consistent descriptions, checklists, and context for reviewers.

---

Every team has experienced the pull request with a one-word description: "fixes." The reviewer opens it, sees 47 changed files across 12 commits, and has no idea what they are looking at. Pull request templates solve this by providing a structured format that the PR author fills in before submitting. When done well, templates save reviewers time, improve the quality of code review, and create a searchable history of why changes were made.

Azure Repos supports PR templates through a simple markdown file in your repository. This guide covers how to set them up, what to include in them, and how to handle different types of changes.

## How PR Templates Work in Azure Repos

When you create a pull request in Azure Repos, the description field is initially blank. But if your repository contains a specially named markdown file, Azure Repos will automatically populate the description with the content of that file. The PR author then fills in the sections before submitting.

The template file must be named and located in one of these locations (in order of priority):

1. `pull_request_template.md` in the repository root
2. `.azuredevops/pull_request_template.md`
3. `docs/pull_request_template.md`

I recommend `.azuredevops/pull_request_template.md` because it keeps the repository root clean and makes it clear this is an Azure DevOps-specific configuration.

## Creating Your First Template

Let me start with a general-purpose template that works for most teams:

```markdown
## Summary
<!-- What does this PR do? Why is this change needed? -->


## Related Work Items
<!-- Link to Azure Boards work items: AB#1234 -->


## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes, no API changes)
- [ ] Documentation update
- [ ] Build/CI configuration change
- [ ] Other (describe below)

## Changes Made
<!-- List the specific changes in this PR -->
-
-
-

## Testing
<!-- How was this tested? Include steps to reproduce if applicable -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] No testing needed (explain why)

## Screenshots
<!-- If applicable, add screenshots to show UI changes -->


## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation if needed
- [ ] My changes generate no new warnings
- [ ] New and existing tests pass locally
```

Save this as `.azuredevops/pull_request_template.md` in your repository:

```bash
# Create the template directory and file
mkdir -p .azuredevops
```

Then commit the file to your main branch.

## Template Design Principles

A good PR template should:

1. **Be short enough that people actually fill it in.** If your template is two pages long, developers will delete it and write "fixes stuff" instead. Keep it focused.

2. **Ask for the "why" not just the "what."** Reviewers can see the code diff to understand what changed. What they need from the description is why it changed and what impact it has.

3. **Include checklists for common requirements.** Checklists are faster to complete than free-form text and they serve as reminders for things developers might forget.

4. **Use HTML comments for instructions.** Text inside `<!-- -->` is visible when editing but hidden in the rendered view. This keeps the rendered PR clean while providing guidance.

## Templates for Different Change Types

### Backend API Changes

```markdown
## Summary
<!-- What endpoint/service is being changed and why? -->


## API Changes
<!-- List any changes to endpoints, request/response schemas, or behavior -->
| Endpoint | Method | Change |
|----------|--------|--------|
|          |        |        |

## Database Changes
- [ ] No database changes
- [ ] Migration added (describe below)
- [ ] Seed data updated

<!-- If there are database changes, describe the migration -->


## Performance Impact
<!-- Will this change affect performance? New queries, changed indexes, etc. -->


## Related Work Items
AB#

## Testing
- [ ] Unit tests cover the changed code
- [ ] API integration tests updated
- [ ] Load tested (if performance-sensitive)
- [ ] Tested against staging environment

## Rollback Plan
<!-- How can this change be rolled back if something goes wrong? -->

```

### Infrastructure Changes

```markdown
## Summary
<!-- What infrastructure is being changed and why? -->


## Resources Affected
<!-- List the Azure resources that will be created, modified, or deleted -->
| Resource | Action | Environment |
|----------|--------|-------------|
|          |        |             |

## Cost Impact
- [ ] No cost impact
- [ ] Cost increase (estimated: $X/month)
- [ ] Cost decrease (estimated: $X/month savings)

## Security Impact
- [ ] No security changes
- [ ] Network rules changed
- [ ] IAM/RBAC changes
- [ ] Secrets or certificates affected

## Deployment Plan
<!-- How should this be deployed? Any special ordering or manual steps? -->


## Related Work Items
AB#

## Checklist
- [ ] Bicep/Terraform validated locally
- [ ] What-if/plan output reviewed
- [ ] Tested in dev environment
- [ ] Rollback procedure documented
```

### Frontend UI Changes

```markdown
## Summary
<!-- What UI change is being made and why? -->


## Visual Changes
<!-- Add before/after screenshots -->
### Before

### After

## Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile (responsive)

## Accessibility
- [ ] Screen reader tested
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA
- [ ] Not applicable

## Related Work Items
AB#

## Testing
- [ ] Component tests added/updated
- [ ] E2E tests added/updated
- [ ] Visually verified in dev environment
```

## Using Multiple Templates

Azure Repos supports only one default template per repository. If you need different templates for different types of changes, there are a few workarounds.

### Approach 1: Include All Sections with Instructions to Delete

Put all the sections in one template with instructions at the top:

```markdown
<!--
  Delete the sections that don't apply to your change:
  - Backend API? Keep "API Changes" and "Database Changes"
  - Frontend UI? Keep "Visual Changes" and "Browser Testing"
  - Infrastructure? Keep "Resources Affected" and "Cost Impact"
-->

## Summary


## Type of Change
- [ ] Backend API
- [ ] Frontend UI
- [ ] Infrastructure
- [ ] Other

<!-- Backend API Section - delete if not applicable -->
## API Changes
...

<!-- Frontend UI Section - delete if not applicable -->
## Visual Changes
...

<!-- Infrastructure Section - delete if not applicable -->
## Resources Affected
...
```

### Approach 2: Additional Templates in a Directory

While Azure Repos only auto-populates from one template, you can store additional templates in the repository and link to them from the default template:

```markdown
## Summary


## Template
<!-- Choose the appropriate template and copy its content below:
  - [API Change Template](.azuredevops/templates/api-change.md)
  - [UI Change Template](.azuredevops/templates/ui-change.md)
  - [Infra Change Template](.azuredevops/templates/infra-change.md)
-->

## Related Work Items
AB#
```

## Enforcing Template Usage

Having a template is one thing. Getting developers to actually fill it in is another. Here are some strategies:

### Use Branch Policies

Configure a build validation policy that checks whether the PR description follows the template structure. Here is a simple script that validates the description:

```python
# validate_pr_description.py
# Run this in a pipeline build validation policy
import os
import sys

# Get the PR description from the pipeline environment
pr_description = os.environ.get('SYSTEM_PULLREQUEST_DESCRIPTION', '')

required_sections = [
    '## Summary',
    '## Type of Change',
    '## Testing',
]

missing_sections = []
for section in required_sections:
    if section not in pr_description:
        missing_sections.append(section)

if missing_sections:
    print(f"PR description is missing required sections: {', '.join(missing_sections)}")
    print("Please use the PR template and fill in all required sections.")
    sys.exit(1)

# Check that Summary section is not empty
summary_start = pr_description.find('## Summary')
next_section = pr_description.find('##', summary_start + 1)
summary_content = pr_description[summary_start:next_section].strip()

if len(summary_content.split('\n')) < 2 or len(summary_content) < 30:
    print("The Summary section appears to be empty. Please describe your changes.")
    sys.exit(1)

print("PR description validation passed.")
```

### Pipeline for PR Validation

```yaml
# pr-validation.yml - validates PR descriptions
trigger: none

pr:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.11'

  - script: python scripts/validate_pr_description.py
    displayName: 'Validate PR description'
    env:
      SYSTEM_PULLREQUEST_DESCRIPTION: $(System.PullRequest.Description)
```

## Team Adoption Tips

1. **Start simple.** A template with just "Summary" and "Testing" sections is better than no template. Add more sections as the team gets comfortable.

2. **Lead by example.** If team leads consistently fill in thorough PR descriptions, the rest of the team will follow.

3. **Make the checklist items genuinely useful.** If a checklist item never applies, remove it. If people always check it reflexively, it is not adding value.

4. **Review and iterate.** After a month of using the template, ask the team what sections are helpful and what is noise. Remove what is not working.

5. **Keep instructions as HTML comments.** The rendered PR should look clean, not like a form with instructions everywhere.

## Wrapping Up

PR templates are a small investment with a big payoff for code review quality. They give PR authors a structure to follow, reviewers context to work with, and the team a consistent record of why changes were made. The template itself takes 10 minutes to write. The harder part is getting the team to adopt it consistently, which is why starting simple and iterating is better than trying to cover every possible scenario from day one. Put a template in your repo, discuss it with your team, and refine it based on what actually helps during code review.
