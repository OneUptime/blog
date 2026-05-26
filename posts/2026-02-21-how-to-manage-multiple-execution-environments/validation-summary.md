# Validation Summary: How to Manage Multiple Execution Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible Execution Environments
- Ansible Builder v3 execution environment definitions
- Ansible Galaxy collections
- ansible-core and ansible-runner
- Podman and Docker container image builds
- GitHub Actions
- dorny/paths-filter
- Bash and Makefile automation
- Ansible Galaxy API

## Sources Consulted
- Ansible Builder execution environment definition documentation: https://docs.ansible.com/projects/builder/en/stable/definition/
- Ansible Builder CLI usage documentation: https://docs.ansible.com/projects/builder/en/latest/usage/
- Ansible Community documentation, Building your first Execution Environment: https://docs.ansible.com/ansible/latest/getting_started_ee/build_execution_environment.html
- Ansible Community documentation, Running Ansible with the community EE image: https://docs.ansible.com/ansible/latest/getting_started_ee/run_community_ee_image.html
- Ansible-core release and maintenance documentation: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/release_and_maintenance.html
- PyPI ansible-core project metadata: https://pypi.org/project/ansible-core/
- dorny/paths-filter documentation: https://github.com/dorny/paths-filter
- Ansible Galaxy API endpoints for `ansible.posix`, `community.general`, `ansible.utils`, `amazon.aws`, and `community.aws`: https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/

## Issues Found
- The base EE used `quay.io/ansible/ansible-runner:latest`, an older base-image pattern from previous Ansible Builder examples. Updated the example to use a current Fedora base image pattern from the Ansible community EE build documentation and explicitly install `python3`, `ansible-core`, and `ansible-runner`.
- The base EE pinned `ansible-core` to `>=2.15.0,<2.17.0`, which is no longer a current supported track as of May 26, 2026. Updated the example and central version file to `>=2.21.0,<2.22.0`, matching the current ansible-core release metadata and supported Python requirements.
- Several collection version examples used old minimums, and the central `COMMUNITY_GENERAL_VERSION` constrained `community.general` to the old 8.x major line. Updated the shown collection constraints to current major versions verified through Ansible Galaxy.
- Specialized EE builds inherited `quay.io/myorg/ee-base:latest` while the examples only built or pushed the versioned base tag. Added the `latest` base tag where the examples rely on it, and added `--build-arg EE_BASE_IMAGE=...` so specialized images can build from the exact base version produced in the same run.
- The Makefile and `build-all.sh` examples built child images without overriding the child EE's `latest` base image reference. Added `EE_BASE_IMAGE` build arguments so child image builds use the synchronized base version.
- The GitHub Actions example used the older `dorny/paths-filter@v3` reference. Updated it to `v4`, the current documented major version.
- The GitHub Actions example ran `ansible-builder build` without selecting Docker, but Ansible Builder defaults to Podman. Added `--container-runtime docker` for hosted-runner compatibility with the subsequent `docker push` commands.
- The GitHub Actions AWS build could use a stale base image when `ee-base` changed because the base was built in a separate job and the child EE still referenced `latest`. Added a local base build in the AWS job when `ee-base` changes and selected either the local SHA tag or registry `latest` via `EE_BASE_IMAGE`.

## Review Notes
- Ansible Builder was not installed in the local environment, so CLI and schema validation were performed against official Ansible Builder documentation rather than local `ansible-builder --help` output.
- The GitHub Actions workflow remains a partial example showing `ee-base` and `ee-aws`; the same base-image handling should be repeated for the omitted Azure, network, and security jobs.
