# Validation Summary: How to Configure rsyslog for Centralized Log Collection on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- rsyslog
- firewalld
- SELinux
- logrotate
- Linux command-line logging tools

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Configuring a remote logging solution: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- rsyslog imtcp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog omfwd module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog actions documentation for `stop`: https://docs.rsyslog.com/doc/configuration/actions.html
- rsyslog omfile `dynaFile` documentation: https://www.rsyslog.com/doc/reference/parameters/omfile-dynafile.html
- rsyslog `programname` property documentation: https://docs.rsyslog.com/doc/reference/properties/message-programname.html
- util-linux `logger --help` output on the review system

## Issues Found
- The dynamic file template used raw `%HOSTNAME%` and `%PROGRAMNAME%` values in a path. rsyslog's `dynaFile` documentation warns that dynamic filename templates should escape path components. Changed the template from a string template to a list template with `securePath="replace"` on the `hostname` and `programname` properties.
- The remote-log rule comment said "ampersand-tilde" stops processing, but the snippet correctly used the modern `stop` statement. Updated the comment to match the configuration.
- The SELinux section instructed readers to add TCP port 514 to `syslogd_port_t`. RHEL 9 documentation treats 514 as the default rsyslog port and only requires `semanage port` for non-default ports. Updated the section to show a custom port example, 30514.
- The test section used `logger` without a tag and then told readers to check `root.log`. The default tag depends on the invoking user, so the expected file was not deterministic. Changed the test command to `logger -t remote-test ...` and the verification path to `remote-test.log`.

## Review Notes
- The TCP and UDP input examples, `omfwd` forwarding examples, firewalld commands, basic filtering selectors, and `rsyslogd -N1` validation command match current RHEL 9 and rsyslog 8 guidance.
- A local `rsyslogd -N1 -f` syntax check against a temporary standalone config could not be completed because this review environment denied rsyslog access to temporary config files. The changed syntax was checked against official rsyslog documentation instead.
- For production environments where message loss is unacceptable, Red Hat documents RELP as a more reliable remote logging option than plain TCP forwarding with queues.
