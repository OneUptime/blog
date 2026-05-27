# Validation Summary: How to Cache Ansible Collections in CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / CI/CD guide

## Technologies Covered
- Ansible and ansible-galaxy
- Ansible Galaxy collections and roles
- GitHub Actions dependency caching
- GitLab CI/CD caching
- Jenkins Pipeline and Job Cacher plugin
- Docker-based CI images
- YAML, Groovy, and Dockerfile configuration

## Sources Consulted
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible configuration settings for collection and role paths: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible role search path documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- GitHub Actions dependency caching documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitLab CI/CD caching documentation: https://docs.gitlab.com/ci/caching/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- Jenkins Pipeline basic steps documentation: https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/
- Jenkins Job Cacher plugin Pipeline step documentation: https://www.jenkins.io/doc/pipeline/steps/jobcacher/
- Local ansible-core 2.19.0 `ansible-galaxy collection install --help` and `ansible-galaxy role install --help` output

## Issues Found
- The GitHub Actions install step used `--force-with-deps` for collections and `--force` for roles. Those flags force overwriting existing content, which undermines the cache benefit on restored caches. Removed the force flags so `ansible-galaxy` can skip already-installed pinned dependencies.
- The Jenkins section recommended `stash/unstash` as better caching. Jenkins stashes are for later use in the same Pipeline run and are discarded at the end of a run by default, so they are not a normal persistent build cache. Reworded the guidance and replaced the snippet with a Job Cacher plugin example.
- The cache invalidation section showed a GitLab cache snippet as "cache with expiry", but the shown `when: on_success` setting is not a cache TTL. Replaced it with a GitHub Actions cache-key period example that accurately demonstrates a scheduled time-based refresh.
- The new time-based refresh snippet initially mixed workflow-level `env` and a step item without a `steps:` key. Added the `steps:` wrapper so the YAML fragment is syntactically valid.

## Review Notes
The post is technically relevant and the overall caching strategy is sound. The performance numbers are experience-based examples rather than guaranteed timings, and actual savings depend on runner locality, cache upload/download cost, collection count, and Galaxy/network latency.
