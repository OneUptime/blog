# Validation Summary: How to Fix ansible-lint YAML Formatting Warnings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-lint
- YAML
- yamllint
- yamlfmt
- Prettier
- GNU grep
- GNU sed
- EditorConfig
- Visual Studio Code settings

## Sources Consulted
- ansible-lint YAML rule documentation: https://docs.ansible.com/projects/lint/rules/yaml/
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- Google yamlfmt README and configuration documentation: https://github.com/google/yamlfmt and https://github.com/google/yamlfmt/blob/main/docs/config-file.md
- Prettier CLI documentation: https://prettier.io/docs/cli
- GNU grep manual: https://www.gnu.org/software/grep/manual/grep.html
- GNU sed manual: https://www.gnu.org/software/sed/manual/

## Issues Found
- The truthy-value explanation implied all modern YAML versions treat `yes`, `no`, `on`, and `off` as booleans. Updated the wording to clarify that this behavior comes from older YAML 1.1 parsers and some YAML tooling, while ansible-lint/yamllint require lowercase `true` and `false`.
- The bulk truthy-value grep command only searched a few specific keys and omitted `.yaml` files, even though the text said it found all `yes`/`no`/`True`/`False` patterns. Replaced it with a broader recursive grep pattern for `.yml` and `.yaml` files.
- The truthy-value sed command only handled lowercase `yes` and `no` in `.yml` files. Updated it to handle `.yaml`, `True`, and `False`, and labeled it as GNU sed because the in-place syntax is GNU-specific.
- The trailing-whitespace grep command only detected literal spaces and omitted `.yaml` files. Updated it to detect trailing blanks and include both `.yml` and `.yaml`.
- The trailing-whitespace sed command used `[[:space:]]`, which can match more than horizontal trailing whitespace. Updated it to `[[:blank:]]` and labeled the command as GNU sed.
- The Prettier command was described as using a YAML plugin, but Prettier has built-in YAML support. Updated the wording.
- The yamlfmt configuration was described as matching ansible-lint expectations. Updated the wording to describe it as a consistent YAML formatting style and added `include_document_start: true` to align with the document-marker examples in the post.
- The document-start section implied this is always an ansible-lint default expectation. Updated the wording to say it applies when the `document-start` rule is enabled.
- The recommended `.yamllint.yml` did not match ansible-lint's compatible defaults. Replaced it with ansible-lint-compatible settings for comments, comments indentation, document-start, line length, braces, and octal values.

## Review Notes
The post is now technically accurate as a practical YAML-formatting guide. The shell replacement commands are still intentionally conservative examples and should be reviewed before committing, as the post already notes.
