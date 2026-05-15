# Validation Summary: How to Set Up Performance Recording with PCP via Cockpit on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Cockpit web console
- Performance Co-Pilot (PCP)
- Linux systemd services

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Monitoring performance on the local system by using the web console": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/using-the-web-console-for-selecting-performance-profiles_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Logging performance data with pmlogger": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/logging-performance-data-with-pmlogger_monitoring-and-managing-system-status-and-performance
- Performance Co-Pilot official documentation: https://pcp.io/documentation.html

## Issues Found
- The post does not contain a working PCP or Cockpit setup procedure. Red Hat's RHEL 9 documentation identifies `cockpit-pcp`, `pmlogger.service`, and `pmproxy.service` as the relevant components for Cockpit performance metrics, but the post never mentions or installs them.
- The commands use placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>`, which are not valid RHEL, Cockpit, or PCP commands and cannot be executed as written.
- The article title says the setup is performed via Cockpit, but the body does not include the documented Cockpit workflow for opening the web console and using the Metrics and history view.
- The service-management examples are generic systemd examples and do not verify the actual PCP services required for performance recording.
- No changes were made to `README.md` because correcting the post would require replacing the placeholder article with a substantially new guide, which is outside the requested scope of fixing technical errors without adding sections or restructuring.

## Review Notes
The topic is technically relevant, but the current post body is generic boilerplate rather than a usable RHEL 9 PCP/Cockpit guide. It should be removed or rewritten from scratch before publication.
