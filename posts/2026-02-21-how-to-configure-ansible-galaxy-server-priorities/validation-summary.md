# Validation Summary: How to Configure Ansible Galaxy Server Priorities

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible collections
- Ansible configuration files
- Red Hat Automation Hub
- Bash, curl, and Python configparser

## Sources Consulted
- Ansible Galaxy user guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Galaxy CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible collections requirements file documentation: https://docs.ansible.com/projects/ansible/6/user_guide/collections_using.html
- Ansible configuration reference for GALAXY_SERVER_LIST, from ansible-core 2.21.0 `ansible/config/base.yml`
- Ansible collection resolver implementation, from ansible-core 2.21.0 `ansible/galaxy/dependency_resolution/providers.py` and `ansible/galaxy/collection/galaxy_api_proxy.py`
- Red Hat Automation Hub configuration documentation: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html-single/getting_started_with_automation_hub/getting_started_with_automation_hub

## Issues Found
- The post described Ansible Galaxy resolution as a strict first-match-wins system where the first server containing a collection always wins. Current Ansible collection resolution considers candidate versions from configured servers, prefers the newest compatible version, and uses server priority to break ties such as the same version being available from multiple servers. Updated the priority explanation, security example, and summary to reflect this.
- The post stated that internal content "always" takes precedence when a private server is first. Changed this to explain that the private server takes precedence for matching compatible versions, and that version pinning or `source` should be used when content must come from a specific server.
- The Red Hat Automation Hub examples used the older `cloud.redhat.com` URL. Updated examples to the current documented `https://console.redhat.com/api/automation-hub/content/published/` URL.
- The connectivity script used `Authorization: Token` for all token-protected servers, which is not accurate for SSO-backed Automation Hub configuration using `auth_url`. Changed the script to test URL reachability without pretending to validate authenticated Galaxy access, and to treat authentication-required HTTP responses as reachable.
- The server failure section stated that Galaxy simply falls through to the next server. Updated it to reflect that Ansible may skip a failing server while searching, but may still fail if required metadata cannot be retrieved.
- The verbose-output section implied a fixed output format. Softened the wording so the example is illustrative rather than a guaranteed exact transcript.

## Review Notes
The post is technically relevant and the remaining commands, configuration keys, requirements-file fields, and environment variable names match Ansible documentation. The local environment did not have `ansible` or `ansible-galaxy` installed, so CLI behavior was verified against official documentation and the current ansible-core package source rather than local command output.
