# Validation Summary: How to Use Release Jobs in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`release` keyword, `release-cli`)
- GitLab Releases, milestones, and release assets/links
- YAML pipeline configuration (`.gitlab-ci.yml`)
- semantic-release and conventional-changelog-cli
- Git tagging / annotated tags
- Node.js / npm build and packaging

## Sources Consulted
- GitLab CI/CD YAML syntax reference — `release` keyword: https://docs.gitlab.com/ci/yaml/#release
- GitLab Releases documentation: https://docs.gitlab.com/user/project/releases/
- GitLab release-cli docs (index): https://gitlab.com/gitlab-org/release-cli/-/blob/master/docs/index.md
- GitLab tutorial: Automate releases and release notes: https://about.gitlab.com/blog/tutorial-automated-release-and-release-notes-with-gitlab/

## Issues Found
The technical content (YAML, keywords, CLI usage) was accurate. The issues found were broken Markdown code-fence delimiters that would corrupt rendering of the post:

1. **Stray `plaintext` on a closing fence (Release with Changelog section).** A nested `bash` block was closed with ` ```plaintext ` instead of ` ``` `. Removed the stray `plaintext` so the fence closes cleanly.
2. **Mismatched outer fence on the "Dynamic Release Description" block.** The block opened with a four-backtick fence (correct, because it nests a `bash` fence) but closed with only three backticks. Changed the closing fence to four backticks so the block terminates correctly.
3. **Mismatched outer fence on the "Release with Assets" block.** The block opened with a three-backtick fence (no nested fences) but closed with four backticks. Changed the closing fence to three backticks.

Left uncorrected (cascading from issues 2 and 3), these mismatches would have merged several sections into one giant code block.

## Review Notes
- Verified that `release:description` accepts a path to a file (e.g., `description: './release_notes.md'`); `release-cli` reads the file contents at release time. This is used correctly throughout the post.
- The `release-cli` image `registry.gitlab.com/gitlab-org/release-cli:latest`, and the `tag_name`, `name`, `description`, `assets:links` (`name`/`url`/`link_type`/`filepath`), `milestones`, and `released_at` sub-keywords are all valid and used correctly. `link_type` values `package` and `other` are valid.
- The "Pre-release and Release Candidates" section is slightly over-promised: the GitLab `release` keyword has no native pre-release flag (unlike GitHub Releases). The example only *detects* a pre-release tag into an env var rather than marking the release itself — which matches GitLab's actual capabilities, so it is not incorrect, just worth noting.
- `needs:` referencing a job in the same stage (`create_tag` needs `determine_version`, both in the `version` stage) is supported in current GitLab versions.
- The artifact URL forms used (`/-/jobs/:id/artifacts/file/...`, `/-/jobs/:id/artifacts/raw/...`, `/-/jobs/artifacts/:ref/raw/...?job=...`, and the `filepath` permalink under `/-/releases/:tag/downloads/...`) are all valid GitLab artifact URL patterns.
- Pushing a tag from CI (`create_tag` job) requires configured push credentials/token; the post does not cover that setup, but the YAML itself is valid.
