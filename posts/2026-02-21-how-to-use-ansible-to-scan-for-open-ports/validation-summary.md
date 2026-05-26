# Validation Summary: How to Use Ansible to Scan for Open Ports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux `ss` socket inspection
- Nmap port scanning
- Bash shell scripting and cron scheduling
- TCP and UDP port audit workflows

## Sources Consulted
- Ansible `wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `fetch` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fetch_module.html
- Ansible `regex_search` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- Linux `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- Nmap port scanning techniques reference: https://nmap.org/book/man-port-scanning-techniques.html
- Nmap port specification reference: https://nmap.org/book/man-port-specification.html
- Nmap output reference: https://nmap.org/book/man-output.html

## Issues Found
- The local TCP parsing example used `regex_search` with a capture backreference in a way that returns a list for matches, which made the later `select('string')` filter drop the parsed ports. Changed the `ss` calls to headerless one-line output and used `regex_replace` to extract the local port reliably.
- The `wait_for` example described generic port checks, but `wait_for` performs TCP connectivity checks for ports. Updated the heading and explanation to say remote TCP checks.
- The `wait_for` reporting task used `failed_when: false`, which can mask the failure status that the debug message depends on. Changed it to `ignore_errors: true` so failed port checks are still registered and can be reported as closed.
- The Nmap parsing pipeline matched any state containing `open`, including `open|filtered`, and could fail when no ports matched. Changed it to print only rows whose state field is exactly `open` and tolerate empty results.
- Several `ss` parsing examples depended on headers, GNU `grep -P`, or brittle field extraction. Updated them to use `ss -H -O` and POSIX-compatible `awk`/`sed` parsing for listener ports and process details.
- The scheduled scan script still skipped the first line as though `ss` output contained a header. Updated it to use headerless `ss` output consistently and compare the local-address field directly.

## Review Notes
The examples are Linux-focused because they rely on `ss`, package-managed Nmap installation, cron, and standard Unix shell tools. Ansible was not installed in the local environment, so full playbook execution was not run; fenced YAML syntax was parsed successfully with PyYAML, and representative shell parsing commands were tested locally.
