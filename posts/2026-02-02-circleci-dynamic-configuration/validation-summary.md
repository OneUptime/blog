# Validation Summary: How to Use CircleCI Dynamic Configuration

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- CircleCI (dynamic configuration / setup workflows)
- `circleci/continuation` orb
- `circleci/path-filtering` orb
- CircleCI pipeline parameters (boolean, enum)
- CircleCI conditional workflows (`when` with `or`)
- CircleCI API v2 (pipeline trigger endpoint)
- cimg convenience Docker images (node, python, base, go, rust)
- Python (PyYAML) and Bash scripting for config generation
- Terraform (referenced in examples)
- npm, pip, pytest (in example job steps)

## Sources Consulted
- CircleCI dynamic configuration guide: https://circleci.com/docs/guides/orchestrate/dynamic-config/
- `circleci/continuation` orb releases: https://github.com/CircleCI-Public/continuation-orb/releases (confirmed v1.0.0 exists; latest is v2.0.1)
- `circleci/path-filtering` orb releases: https://github.com/CircleCI-Public/path-filtering-orb/releases (confirmed v1.0.0 exists; latest is v3.0.0)
- CircleCI pipeline values and parameters: https://circleci.com/docs/pipeline-variables/
- CircleCI conditional workflows: https://support.circleci.com/hc/en-us/articles/360043638052
- CircleCI API v2 reference: https://circleci.com/docs/api/v2/
- cimg image registry: https://circleci.com/developer/images/image/cimg/node, cimg/base, cimg/python
- Cross-reference with other CircleCI posts in this repo for convention consistency

## Issues Found

1. **Broken heredoc syntax (`\<<` instead of `<<`)** — Three code blocks used `cat > /tmp/generated-config.yml \<< 'EOF'` with an unnecessary backslash escape before `<<`. The backslash is not valid markdown rendering syntax (other posts in this same blog use plain `<<` in heredocs), and renders literally as `\<<` in the output, which would not work when copied into a real config. Fixed all three occurrences (in the "Basic Setup Job Structure", "Error Handling and Fallbacks", and "Performance Optimization Tips" sections) by removing the backslash.

## Review Notes

- **Orb versions are valid but not latest.** Both `circleci/continuation@1.0.0` and `circleci/path-filtering@1.0.0` are real published versions and remain functional, but newer versions exist (continuation v2.0.1, path-filtering v3.0.0). Left as-is because the syntax shown is compatible with the pinned versions and the post does not claim these are the latest.

- **`CIRCLE_PIPELINE_SCHEDULED` is not a CircleCI built-in env var.** In the Python `should_run_nightly_jobs()` example, the variable name follows the `CIRCLE_*` pattern of built-in CircleCI environment variables but is actually a custom variable the user would have to set themselves. The proper built-in detection mechanism is `<< pipeline.trigger.type >>` (or the legacy `<< pipeline.trigger_source >>`). Left as-is because the surrounding code is presented as user-authored example logic and `NIGHTLY_BUILD` next to it is clearly also a custom var — but readers should be aware this is not auto-populated by CircleCI.

- **API endpoint vcs-slug caveat.** The `https://circleci.com/api/v2/project/github/your-org/your-repo/pipeline` example works for legacy GitHub OAuth-integrated projects. Projects integrated via the modern CircleCI GitHub App use a project slug of the form `circleci/<org-id>/<project-id>` instead. Not strictly wrong but worth noting for newer projects.

- **`.*/Dockerfile` regex caveat.** This pattern in the advanced path-filtering mapping matches `anything/Dockerfile` but not a top-level `Dockerfile` (no slash). The comment says "Match Dockerfiles anywhere", which is slightly looser than what the regex achieves. Minor and the spirit is conveyed; left unchanged.

- **`continuation/continue` parameter naming.** Recent versions of the continuation orb (v2.x) renamed `configuration_path` to `configuration_path` (it is still spelled this way), but also accept additional optional inputs. The current usage is correct for v1.0.0 as pinned.
