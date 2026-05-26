# Validation Summary: How to Use Ansible Facts to Get CPU Information

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible facts and playbooks
- Jinja2 templating in Ansible
- Nginx worker configuration
- Gunicorn worker configuration
- Maven build parallelism
- Gradle worker configuration

## Sources Consulted
- Ansible facts documentation: https://docs.ansible.com/projects/ansible-core/2.20/playbook_guide/playbooks_vars_facts.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/setup_module.html
- Ansible Linux hardware fact source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/module_utils/facts/hardware/linux.py
- Ansible builtin module index for assert, get_url, group_by, service, set_fact, template, and copy modules: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/index.html
- Ansible tests documentation for match/reject style templating: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- NGINX runtime control documentation: https://docs.nginx.com/nginx/admin-guide/basic-functionality/runtime-control/
- Gunicorn design documentation: https://docs.gunicorn.org/en/stable/design.html
- Gunicorn settings documentation: https://gunicorn.org/reference/settings/
- Apache Maven configuration documentation: https://maven.apache.org/configure
- Maven multithreaded builder API documentation: https://maven.apache.org/ref/3.8.9/maven-core/apidocs/org/apache/maven/lifecycle/internal/builder/multithreaded/MultiThreadedBuilder.html
- Gradle build environment documentation: https://docs.gradle.org/current/userguide/build_environment.html
- Gradle native software worker documentation: https://docs.gradle.org/current/userguide/native_software.html

## Issues Found
- The post described `ansible_facts['processor']` as a list of CPU model strings. On Linux, Ansible can include numeric processor IDs and vendor strings as well as model strings in this list. Updated the description to call it platform-dependent and adjusted the examples to ignore numeric entries and select the last non-numeric value instead of the first alphabetic value, which could incorrectly return `GenuineIntel`.
- The build environment example exported Maven's `-T` thread option through `MAVEN_OPTS`. Official Maven documentation defines `MAVEN_OPTS` for JVM options, while Maven CLI arguments can be supplied through `MAVEN_ARGS` in current Maven versions. Updated the example to use `MAVEN_ARGS`.

## Review Notes
- The Ansible CPU topology facts in the post match the current Linux fact-gathering implementation, but exact values are platform-dependent. `processor_nproc` is the better fact when process affinity or CPU availability differs from hardware topology.
- The Nginx, Gunicorn, and Gradle examples are valid as tuning starting points, but production values should still be load-tested for the specific workload.
