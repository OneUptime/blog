# Validation Summary: How to Use Ansible to Configure Tomcat for Java Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, task imports, tags, handlers, and built-in modules
- Apache Tomcat 10.1
- Java 17 JVM options and JMX configuration
- Ubuntu 22.04 package management
- systemd service units
- Java WAR deployment

## Sources Consulted
- Apache Tomcat 10 downloads: https://tomcat.apache.org/download-10.cgi
- Apache Tomcat 10.1 setup documentation: https://tomcat.apache.org/tomcat-10.1-doc/setup.html
- Apache Tomcat 10.1 HTTP Connector reference: https://tomcat.apache.org/tomcat-10.1-doc/config/http.html
- Apache Tomcat 10.1 Manager App HOW-TO: https://tomcat.apache.org/tomcat-10.1-doc/manager-howto.html
- Apache Tomcat 10.1 Deployer HOW-TO: https://tomcat.apache.org/tomcat-10.1-doc/deployer-howto.html
- Apache Tomcat 10.1 Valve reference: https://tomcat.apache.org/tomcat-10.1-doc/config/valve.html
- Ansible `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Oracle Java 17 Monitoring and Management Using JMX Technology: https://docs.oracle.com/en/java/javase/17/management/monitoring-and-management-using-jmx-technology.html
- systemd service unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html

## Issues Found
- The post claimed to include SSL configuration, but the snippets only configure an HTTP connector with `redirectPort`. Changed the wording to HTTP connector configuration.
- The Tomcat version was pinned to `10.1.18`, an old release that is no longer the current Tomcat 10.1 download on `dlcdn.apache.org`. Updated the example to `10.1.55` and verified the download URL returned HTTP 200 on 2026-05-27.
- The Tomcat download task did not verify the archive. Added a checksum URL and `get_url` checksum validation using the official `.sha512` file.
- The variable list included `tomcat_ajp_port`, but the server configuration did not define an AJP connector. Removed the unused variable.
- The deployment path expression collapsed nested context paths such as `/foo/bar` into `foobar.war`. Added `app_war_name` and used Tomcat's `#` naming convention for nested context WAR files.
- The manager app tasks referenced `tomcat-users.xml.j2` and `context.xml.j2`, but the post did not provide those template contents. Added minimal Tomcat 10.1-compatible templates with `manager-gui` and `manager-script` roles plus a `RemoteAddrValve` allowlist.
- The manager credentials task could expose the password in Ansible output. Added `no_log: true`.
- The hardening task removed some default webapps but left `host-manager` installed even though the post did not configure it. Added `host-manager` to the removal list.
- The `uri` verification task used `retries` and `delay` without an `until` condition. Added `register` and `until` so the check actually retries on older Ansible versions such as the post's Ansible 2.9 baseline.
- The `--tags deploy` command would not reliably run deployment tasks because tags on `include_tasks` do not inherit to included tasks by default. Changed `include_tasks` to static `import_tasks` with tags.
- The JVM script enabled remote JMX with SSL and authentication disabled. Replaced those options with local-only JMX binding to avoid exposing unauthenticated management access.
- The wrap-up said the manager application was restricted but the original post did not show an actual access restriction. Updated the template and wording to specify trusted-address restriction.

## Review Notes
- Ansible was not installed in the local environment, so I could not run `ansible-playbook --syntax-check`; the snippets were reviewed against official module and playbook documentation instead.
- The example uses a placeholder manager password value. A production playbook should define `vault_tomcat_admin_password` with Ansible Vault or another secret-management workflow before running it.
