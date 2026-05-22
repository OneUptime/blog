# Validation Summary: How to Set Up Code Owners for Terraform Files

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform repository organization
- GitHub CODEOWNERS
- GitHub branch protection
- GitLab Code Owners
- Bitbucket Code Owners
- GitHub Actions

## Sources Consulted
- GitHub Docs: About code owners - https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitLab Docs: Syntax of CODEOWNERS file - https://docs.gitlab.com/user/project/codeowners/reference/
- GitLab Docs: Code Owners - https://docs.gitlab.com/user/project/codeowners/
- Atlassian Support: Set up and use code owners - https://support.atlassian.com/bitbucket-cloud/docs/set-up-and-use-code-owners/

## Issues Found
- GitHub CODEOWNERS location order was incorrect. GitHub searches `.github/`, then the repository root, then `docs/`; the post listed the root first. Updated the order.
- The GitHub multiple-owner example did not mention that an approval from any one listed owner satisfies a single matching rule. Added a clarifying comment.
- The negation note could be read as a broader statement than the GitHub syntax rule. Clarified that `!` negation is unsupported.
- The cross-team example said reviews from all three teams would be required. Changed this to say reviews are requested, avoiding overstatement across platforms and branch protection configurations.
- The sample validation workflow claimed to check that all referenced teams exist, but the shell snippet did not perform that check and handled leading-slash patterns incorrectly. Adjusted the comments and stripped a leading `/` before the basic local file match.

## Review Notes
The included shell validation remains intentionally simplified and should not be treated as a complete CODEOWNERS parser. Production CI should use a dedicated CODEOWNERS validator or platform API checks.
