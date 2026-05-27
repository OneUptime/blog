# Validation Summary: How to Use Ansible with Git Webhooks for Auto-Deployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-playbook
- GitHub webhooks
- GitLab webhooks
- Python
- Flask
- Gunicorn
- systemd
- Nginx
- HMAC-SHA256 webhook signatures

## Sources Consulted
- GitHub Docs: Validating webhook deliveries - https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub Docs: Creating webhooks - https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks
- GitHub Docs: Troubleshooting webhooks - https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks
- GitHub Docs: REST API endpoints for meta data - https://docs.github.com/rest/reference/meta
- GitHub Docs: About GitHub's IP addresses - https://docs.github.com/en/github/authenticating-to-github/about-githubs-ip-addresses
- GitLab Docs: Webhooks - https://docs.gitlab.com/user/project/integrations/webhooks/
- Ansible Docs: ansible-playbook CLI - https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible Docs: ansible.builtin.git module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible Docs: ansible.builtin.command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Docs: ansible.builtin.uri module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Gunicorn Docs: Running Gunicorn - https://gunicorn.org/run/
- Nginx Docs: ngx_http_access_module - https://nginx.org/en/docs/http/ngx_http_access_module.html
- systemd.exec manual: Environment= syntax - https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found
- The introduction said the tutorial covered GitHub, GitLab, and Bitbucket push events, but the implementation only provided GitHub verification plus a GitLab note. Changed the wording to GitHub with notes for GitLab.
- The deployment playbook defined `deploy_version` in terms of itself, which can cause recursive templating when no extra var is supplied. Moved the default expression directly into the `git` task's `version` parameter.
- The systemd unit used an unquoted `Environment=WEBHOOK_SECRET={{ webhook_secret }}` assignment. Quoted the assignment so secrets containing characters that require systemd quoting are handled correctly.
- The GitHub webhook Payload URL used `https://deploy.myorg.com:9000/webhook`, but the Nginx TLS example listens on standard HTTPS port 443 and proxies to local port 9000. Changed the URL to `https://deploy.myorg.com/webhook`.
- The GitLab example used the legacy `X-Gitlab-Token` secret token, which GitLab now marks as weaker and not recommended for new webhooks. Replaced it with a signing-token verification example using `webhook-id`, `webhook-timestamp`, and `webhook-signature`.
- The Nginx example hardcoded GitHub webhook IP ranges. GitHub documents that IP ranges change and should be retrieved from the Meta API. Replaced the static ranges with an include file generated from the current `hooks` list at `https://api.github.com/meta`.

## Review Notes
The main Python and GitLab verification snippets parse successfully, and the two YAML playbook examples parse as YAML. `ansible-playbook` was not installed in this environment, so CLI behavior was verified against official Ansible documentation rather than local `--help` output.
